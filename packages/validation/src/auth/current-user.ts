import { z } from 'zod';

/**
 * plans/07-authentication-authorization.md §5 — the shape `@CurrentUser()`
 * resolves to, and the one both web/mobile clients share for "what a
 * logged-in user looks like" (§7). Deliberately narrower than the full
 * Prisma `User` model: only the fields authorization decisions and the UI
 * chrome (account menu, admin-only nav) actually need.
 */
export const CurrentUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().nullable(),
  isAdmin: z.boolean(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
