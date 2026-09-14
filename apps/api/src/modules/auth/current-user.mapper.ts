/**
 * Maps Better Auth's session user object onto `CurrentUser` (Plan 07 §5) —
 * the one place that knows Better Auth's outward-facing user shape still
 * calls the display-name attribute `name` (its own public API key) even
 * though `auth-instance.ts` remaps its *storage column* to `displayName`,
 * and that `isAdmin` arrives as an untyped additional field. Every guard/
 * decorator in this module goes through this instead of trusting Better
 * Auth's user object shape directly.
 */
import { CurrentUserSchema, type CurrentUser } from '@vehicles-marketplace/validation';

export function toCurrentUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  isAdmin?: unknown;
}): CurrentUser {
  return CurrentUserSchema.parse({
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.name ?? null,
    isAdmin: user.isAdmin === true,
  });
}
