import { describe, expect, it } from 'vitest';
import { RegisterRequestSchema } from './register-request';

const valid = { email: 'jane@example.com', password: 'abc12345', confirmPassword: 'abc12345' };

describe('RegisterRequestSchema', () => {
  it('accepts matching, valid fields', () => {
    expect(RegisterRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = RegisterRequestSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('reports a mismatched confirmPassword on the confirmPassword field', () => {
    const result = RegisterRequestSchema.safeParse({ ...valid, confirmPassword: 'different1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.confirmPassword?.[0]).toBe('Passwords do not match');
      expect(fieldErrors.password).toBeUndefined();
    }
  });
});
