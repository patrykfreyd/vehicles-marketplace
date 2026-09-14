import { z } from 'zod';
import { PasswordSchema } from './password';

/** `token` comes from the reset-password email link's query string, not a
 * field the user types — see apps/web/app/reset-password/page.tsx and
 * apps/mobile/app/reset-password.tsx. */
export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, 'Reset link is missing or invalid'),
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
