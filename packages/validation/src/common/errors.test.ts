import { describe, expect, it } from 'vitest';
import { ApiErrorSchema } from './errors';

describe('ApiErrorSchema', () => {
  it('accepts an error with no fieldErrors (toast-only)', () => {
    const result = ApiErrorSchema.safeParse({
      code: 'NOT_FOUND',
      message: 'That listing no longer exists.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a VALIDATION_ERROR with fieldErrors', () => {
    const result = ApiErrorSchema.safeParse({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: { email: ['Enter a valid email address.'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an error missing a message', () => {
    const result = ApiErrorSchema.safeParse({ code: 'NOT_FOUND' });
    expect(result.success).toBe(false);
  });

  it('rejects fieldErrors whose values are not string arrays', () => {
    const result = ApiErrorSchema.safeParse({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: { email: 'Enter a valid email address.' },
    });
    expect(result.success).toBe(false);
  });
});
