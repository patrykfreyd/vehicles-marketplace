import { z } from 'zod';

/**
 * plans/07-authentication-authorization.md §3 — login failures are always a
 * generic toast, never a field error, so this schema intentionally does
 * *not* re-run password-strength rules here: a wrong password on an
 * existing (already-valid) account must fail the same way a too-short
 * string would, both as one opaque "Incorrect email or password" toast from
 * the server response, never as an inline field error that could hint at
 * which rule failed.
 */
export const LoginRequestSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
