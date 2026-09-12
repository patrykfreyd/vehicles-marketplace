import { describe, expect, it } from 'vitest';
import { MoneyPenceSchema } from './money';

describe('MoneyPenceSchema', () => {
  it('accepts a non-negative integer', () => {
    expect(MoneyPenceSchema.safeParse(1_999_00).success).toBe(true);
    expect(MoneyPenceSchema.safeParse(0).success).toBe(true);
  });

  it('rejects a negative amount', () => {
    expect(MoneyPenceSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects a float (money is always integer minor units)', () => {
    expect(MoneyPenceSchema.safeParse(19.99).success).toBe(false);
  });
});
