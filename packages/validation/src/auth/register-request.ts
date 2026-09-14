import { z } from 'zod';
import { PasswordSchema } from './password';

/**
 * plans/07-authentication-authorization.md §6 — email/password only; no
 * "name" field (see @vehicles-marketplace/utils' `deriveDisplayNameFromEmail`
 * for why). `confirmPassword`'s mismatch message is attached to
 * `confirmPassword` itself via `.refine(..., { path: ['confirmPassword'] })`
 * so <FormField name="confirmPassword"> renders it inline the moment the
 * two fields diverge, per §6's "confirm-password mismatch shows inline on
 * the confirm field" rule.
 */
export const RegisterRequestSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
