import { z } from 'zod';

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
