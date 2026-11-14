import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { lockedUntil } from "@/auth/lockout";
import { attemptLogin, hasAdmin, setupAdmin } from "@/auth/login";
import { hashPassword, passwordProblem, verifyPassword } from "@/auth/password";
import { createSession, deleteSession, readSession } from "@/auth/session";
import { sessions } from "@/db/schema";
import { testDb } from "./helpers";

const t0 = new Date("2026-11-14T10:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const fail = (min: number) => ({ at: at(min), ok: false });
const DAY = 86_400_000;

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "correct horse battery")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
    expect(await verifyPassword("not a hash", "x")).toBe(false);
  });
  it("explains weak or mismatched passwords", () => {
    expect(passwordProblem("short", "short")).toBe("Use at least 12 characters.");
    expect(passwordProblem("long enough password", "different password")).toBe("The two passwords do not match.");
    expect(passwordProblem("long enough password", "long enough password")).toBeNull();
  });
});

describe("lockedUntil (attempts newest first)", () => {
  it("does not lock after four failures", () => {
    expect(lockedUntil([fail(4), fail(3), fail(2), fail(1)], at(5))).toBeNull();
  });
  it("locks for 15 minutes after five failures within 15 minutes", () => {
    const attempts = [fail(10), fail(8), fail(6), fail(3), fail(0)];
    expect(lockedUntil(attempts, at(11))).toEqual(at(25));
    expect(lockedUntil(attempts, at(25))).toBeNull();
  });
  it("ignores five failures spread over more than 15 minutes", () => {
    expect(lockedUntil([fail(20), fail(15), fail(10), fail(5), fail(0)], at(21))).toBeNull();
  });
  it("starts counting again after a success", () => {
    expect(lockedUntil([fail(5), fail(4), { at: at(3), ok: true }, fail(2), fail(1), fail(0)], at(6))).toBeNull();
  });
});

describe("sessions", () => {
  it("stores only a digest, rolls the expiry at most daily, and expires after 14 idle days", () => {
    const db = testDb();
    const { token, expiresAt } = createSession(db, "UA", t0);
    expect(expiresAt).toEqual(new Date(t0.getTime() + 14 * DAY));
    expect(db.select().from(sessions).get()!.id).not.toBe(token);

    expect(readSession(db, token, at(60))).toMatchObject({ renewed: false });
    const nextDay = new Date(t0.getTime() + DAY + 60_000);
    expect(readSession(db, token, nextDay)).toMatchObject({ renewed: true, expiresAt: new Date(nextDay.getTime() + 14 * DAY) });
    expect(readSession(db, "not-a-token", nextDay)).toBeNull();

    const idle = new Date(nextDay.getTime() + 15 * DAY);
    expect(readSession(db, token, idle)).toBeNull();
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });
  it("deletes a session on sign out", () => {
    const db = testDb();
    const { token } = createSession(db, "UA", t0);
    deleteSession(db, token);
    expect(readSession(db, token, t0)).toBeNull();
  });
});

describe("setup and login", () => {
  it("sets the password once, signs in, and locks out after five wrong passwords", async () => {
    const db = testDb();
    expect(await attemptLogin(db, "anything", "UA", t0)).toMatchObject({ ok: false, needsSetup: true });
    expect(await setupAdmin(db, "short", "short", "UA", t0)).toMatchObject({ ok: false, error: "Use at least 12 characters." });

    const first = await setupAdmin(db, "a long test password", "a long test password", "UA", t0);
    expect(first.ok).toBe(true);
    expect(hasAdmin(db)).toBe(true);
    expect(await setupAdmin(db, "another long password", "another long password", "UA", t0)).toMatchObject({
      ok: false,
      error: "A password is already set. Sign in instead.",
    });

    expect(await attemptLogin(db, "a long test password", "UA", at(1))).toMatchObject({ ok: true });
    for (let i = 0; i < 5; i++) {
      expect(await attemptLogin(db, "wrong password", "UA", at(2 + i))).toMatchObject({
        ok: false,
        error: "That password is not right.",
      });
    }
    // Failures at minutes 2..6, so the lock lifts at minute 21.
    expect(await attemptLogin(db, "a long test password", "UA", at(8))).toMatchObject({
      ok: false,
      error: "Too many wrong passwords. Try again in 13 minutes.",
    });
    expect(await attemptLogin(db, "a long test password", "UA", at(22))).toMatchObject({ ok: true });
  });
});

describe("concurrency", () => {
  it("counts parallel wrong passwords against the lockout", async () => {
    const db = testDb();
    await setupAdmin(db, "a long test password", "a long test password", "UA", t0);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => attemptLogin(db, "wrong password", "UA", at(1))),
    );
    const errors = results.map((r) => (r.ok ? "" : r.error));
    expect(errors.filter((e) => e === "That password is not right.")).toHaveLength(5);
    expect(errors.filter((e) => e.startsWith("Too many wrong passwords."))).toHaveLength(3);
  });
  it("lets exactly one of two parallel first-run setups win", async () => {
    const db = testDb();
    const results = await Promise.all([
      setupAdmin(db, "a long test password", "a long test password", "UA", t0),
      setupAdmin(db, "another long password", "another long password", "UA", t0),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "A password is already set. Sign in instead.")).toHaveLength(1);
  });
  it("rethrows setup errors that are not a primary-key clash", async () => {
    const db = testDb();
    db.run(sql`CREATE TRIGGER block_admin BEFORE INSERT ON admin_user BEGIN SELECT RAISE(ABORT, 'blocked'); END`);
    await expect(setupAdmin(db, "a long test password", "a long test password", "UA", t0)).rejects.toThrow();
    expect(hasAdmin(db)).toBe(false);
  });
});

