import { describe, expect, it } from 'vitest';
import { ResetPasswordRequestSchema } from './reset-password-request';

const valid = { token: 'tok_123', password: 'abc12345', confirmPassword: 'abc12345' };

describe('ResetPasswordRequestSchema', () => {
  it('accepts a valid token and matching passwords', () => {
    expect(ResetPasswordRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing token', () => {
    expect(ResetPasswordRequestSchema.safeParse({ ...valid, token: '' }).success).toBe(false);
  });

  it('reports a mismatched confirmPassword on the confirmPassword field', () => {
    const result = ResetPasswordRequestSchema.safeParse({ ...valid, confirmPassword: 'nope1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword?.[0]).toBe(
        'Passwords do not match',
      );
    }
  });
});
