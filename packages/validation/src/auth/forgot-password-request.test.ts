import { describe, expect, it } from 'vitest';
import { ForgotPasswordRequestSchema } from './forgot-password-request';

describe('ForgotPasswordRequestSchema', () => {
  it('accepts a valid email', () => {
    expect(ForgotPasswordRequestSchema.safeParse({ email: 'jane@example.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(ForgotPasswordRequestSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});
