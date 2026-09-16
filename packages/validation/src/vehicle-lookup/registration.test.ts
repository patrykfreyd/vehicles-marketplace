import { describe, expect, it } from 'vitest';
import { normalizeRegistration, RegistrationInputSchema } from './registration';

describe('normalizeRegistration', () => {
  it('uppercases and strips whitespace', () => {
    expect(normalizeRegistration(' ya22 gzx ')).toBe('YA22GZX');
  });
});

describe('RegistrationInputSchema', () => {
  it('accepts a current-format plate with a space', () => {
    const result = RegistrationInputSchema.safeParse('YA22 GZX');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('YA22GZX');
  });

  it('accepts a dateless-format plate', () => {
    expect(RegistrationInputSchema.safeParse('123 ABC').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(RegistrationInputSchema.safeParse('').success).toBe(false);
  });

  it('rejects punctuation', () => {
    expect(RegistrationInputSchema.safeParse('YA22-GZX!').success).toBe(false);
  });

  it('rejects something implausibly long', () => {
    expect(RegistrationInputSchema.safeParse('WAYTOOLONGAREG').success).toBe(false);
  });
});
