import { describe, expect, it } from 'vitest';
import { assertNever, isNonEmptyString } from './index';

describe('isNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(isNonEmptyString('hi')).toBe(true);
  });

  it('rejects an empty string and non-strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
  });
});

describe('assertNever', () => {
  it('throws with the unexpected value', () => {
    expect(() => assertNever('unreachable' as never)).toThrow(/Unexpected value/);
  });
});
