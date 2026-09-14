/**
 * Registration (plans/07-authentication-authorization.md §6) deliberately
 * collects only email/password — no "full name" field — but Better Auth's
 * core `name` attribute is required input on every sign-up call regardless.
 * Rather than adding a form field the plan didn't ask for, both clients
 * derive a starting display name from the email's local part; the user can
 * change it later from account settings (out of scope for this plan).
 */
export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}
