/** The owner's full name, falling back to first and last name when the full name is empty. */
export function fullName(p: { fullName: string | null; firstName: string; lastName: string }): string {
  return p.fullName?.trim() || `${p.firstName} ${p.lastName}`;
}
