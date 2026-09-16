import { describe, expect, it } from 'vitest';
import { SellerTypeSchema } from './seller-type';

describe('SellerTypeSchema', () => {
  it('accepts every documented value', () => {
    for (const value of ['PRIVATE', 'DEALER']) {
      expect(SellerTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(SellerTypeSchema.safeParse('private').success).toBe(false);
    expect(SellerTypeSchema.safeParse('TRADE').success).toBe(false);
  });
});
