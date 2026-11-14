import { desc, eq, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { adminUser, loginAttempts } from "@/db/schema";
import { lockedUntil } from "./lockout";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { createSession } from "./session";

export type AuthResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string; needsSetup?: boolean };

const ALREADY_SET = "A password is already set. Sign in instead.";

/** SQLite reports a duplicate primary key as SQLITE_CONSTRAINT_PRIMARYKEY, directly or on a wrapped cause. */
function isPrimaryKeyClash(err: unknown): boolean {
  const code = (e: unknown) => (typeof e === "object" && e !== null && "code" in e ? (e as { code: unknown }).code : undefined);
  const cause = typeof err === "object" && err !== null && "cause" in err ? (err as { cause: unknown }).cause : undefined;
  return code(err) === "SQLITE_CONSTRAINT_PRIMARYKEY" || code(cause) === "SQLITE_CONSTRAINT_PRIMARYKEY";
}

export function hasAdmin(db: Db): boolean {
  return db.select({ id: adminUser.id }).from(adminUser).get() !== undefined;
}

export async function attemptLogin(db: Db, password: string, userAgent: string, now: Date): Promise<AuthResult> {
  const user = db.select().from(adminUser).get();
  if (!user) return { ok: false, error: "Set a password first.", needsSetup: true };

  const recent = db
    .select({ at: loginAttempts.at, ok: loginAttempts.ok })
    .from(loginAttempts)
    .orderBy(desc(loginAttempts.at), desc(loginAttempts.id))
    .limit(10)
    .all();
  const until = lockedUntil(recent, now);
  if (until) {
    const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
    return { ok: false, error: `Too many wrong passwords. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` };
  }

  // Record the attempt as a failure before awaiting argon2, so parallel requests see it in the lockout check.
  const attempt = db.insert(loginAttempts).values({ at: now, ok: false }).returning({ id: loginAttempts.id }).get();
  db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(now.getTime() - 86_400_000))).run();

  const ok = password.length > 0 && (await verifyPassword(user.passwordHash, password));
  if (!ok) return { ok: false, error: "That password is not right." };
  db.update(loginAttempts).set({ ok: true }).where(eq(loginAttempts.id, attempt.id)).run();
  return { ok: true, ...createSession(db, userAgent, now) };
}

/** First run only: sets the one owner password and signs in. */
export async function setupAdmin(db: Db, password: string, confirm: string, userAgent: string, now: Date): Promise<AuthResult> {
  if (hasAdmin(db)) return { ok: false, error: ALREADY_SET };
  const problem = passwordProblem(password, confirm);
  if (problem) return { ok: false, error: problem };
  const passwordHash = await hashPassword(password);
  try {
    db.insert(adminUser).values({ id: 1, passwordHash }).run();
  } catch (err) {
    if (isPrimaryKeyClash(err)) return { ok: false, error: ALREADY_SET }; // lost a race with another setup request
    throw err;
  }
  return { ok: true, ...createSession(db, userAgent, now) };
}
