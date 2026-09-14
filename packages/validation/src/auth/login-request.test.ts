import { describe, expect, it } from 'vitest';
import { LoginRequestSchema } from './login-request';

describe('LoginRequestSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(LoginRequestSchema.safeParse({ email: 'jane@example.com', password: 'x' }).success).toBe(
      true,
    );
  });

  it('rejects a missing password', () => {
    expect(LoginRequestSchema.safeParse({ email: 'jane@example.com', password: '' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid email', () => {
    expect(LoginRequestSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});
