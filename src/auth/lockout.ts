export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;
export const LOCK_MS = 15 * 60_000;

export type Attempt = { at: Date; ok: boolean };

/**
 * Spec §6: after 5 failed attempts in 15 minutes, a 15-minute lockout.
 * `attempts` must be newest first. Returns when the lock lifts, or null when sign-in is allowed.
 */
export function lockedUntil(attempts: Attempt[], now: Date): Date | null {
  const failures: Date[] = [];
  for (const a of attempts) {
    if (a.ok) break;
    failures.push(a.at);
    if (failures.length === MAX_FAILURES) break;
  }
  if (failures.length < MAX_FAILURES) return null;
  const newest = failures[0];
  const oldest = failures[failures.length - 1];
  if (newest.getTime() - oldest.getTime() > WINDOW_MS) return null;
  const until = new Date(newest.getTime() + LOCK_MS);
  return until.getTime() > now.getTime() ? until : null;
}
