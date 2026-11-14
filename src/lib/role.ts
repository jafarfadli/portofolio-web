export type Role = "public" | "admin";

/** ROLE=admin turns the editor on. Anything else, including unset, is the public role: fail closed. */
export function role(): Role {
  return process.env.ROLE === "admin" ? "admin" : "public";
}

export function isAdminRole(): boolean {
  return role() === "admin";
}
