import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD = 12;

/** argon2id with the library defaults (19 MiB, 2 passes, 1 lane): the OWASP baseline. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/** False for a wrong password and for a malformed hash; never throws. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 256) return "Use at most 256 characters.";
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}
