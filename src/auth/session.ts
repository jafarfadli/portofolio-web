import crypto from "node:crypto";
import { eq, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessions } from "@/db/schema";
import { SESSION_DAYS } from "./cookie";

export { SESSION_DAYS };
const DAY = 86_400_000;

export type Session = { id: string; expiresAt: Date; renewed: boolean };

const digest = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** A fresh 256-bit token. Only its sha256 is stored, so a copied database cannot be replayed as a cookie. */
export function createSession(db: Db, userAgent: string, now: Date): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY);
  db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
  db.insert(sessions).values({ id: digest(token), expiresAt, createdAt: now, userAgent: userAgent.slice(0, 300) }).run();
  return { token, expiresAt };
}

/** Rolling expiry: a session used a day or more after its last renewal moves out to 14 days from now. */
export function readSession(db: Db, token: string, now: Date): Session | null {
  if (!token) return null;
  const id = digest(token);
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) return null;
  if (row.expiresAt.getTime() <= now.getTime()) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  const fresh = new Date(now.getTime() + SESSION_DAYS * DAY);
  if (fresh.getTime() - row.expiresAt.getTime() >= DAY) {
    db.update(sessions).set({ expiresAt: fresh }).where(eq(sessions.id, id)).run();
    return { id, expiresAt: fresh, renewed: true };
  }
  return { id, expiresAt: row.expiresAt, renewed: false };
}

export function deleteSession(db: Db, token: string): void {
  db.delete(sessions).where(eq(sessions.id, digest(token))).run();
}
