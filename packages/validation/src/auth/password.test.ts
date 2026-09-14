import { describe, expect, it } from 'vitest';
import { PasswordSchema } from './password';

describe('PasswordSchema', () => {
  it('accepts a password with letters and numbers, 8+ characters', () => {
    expect(PasswordSchema.safeParse('abc12345').success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = PasswordSchema.safeParse('abc123');
    expect(result.success).toBe(false);
  });

  it('rejects a password with no number', () => {
    const result = PasswordSchema.safeParse('abcdefgh');
    expect(result.success).toBe(false);
  });

  it('rejects a password with no letter', () => {
    const result = PasswordSchema.safeParse('12345678');
    expect(result.success).toBe(false);
  });
});
