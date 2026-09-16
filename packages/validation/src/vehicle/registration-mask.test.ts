import { describe, expect, it } from 'vitest';
import { maskRegistration } from './registration-mask';

describe('maskRegistration', () => {
  it('keeps the age-identifier prefix and blanks the rest for a current-format plate', () => {
    expect(maskRegistration('YA22XYZ')).toBe('YA22 ***');
  });

  it('normalizes case and whitespace before masking', () => {
    expect(maskRegistration(' ya22 xyz ')).toBe('YA22 ***');
  });

  it('masks in full when the input is too short to safely split', () => {
    expect(maskRegistration('ABC')).toBe('***');
    expect(maskRegistration('')).toBe('***');
  });
});
