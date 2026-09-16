import { describe, expect, it } from 'vitest';
import { ListingStatusSchema } from './listing-status';

describe('ListingStatusSchema', () => {
  it('accepts every documented status, including PAUSED', () => {
    for (const value of ['DRAFT', 'LIVE', 'PAUSED', 'RESERVED', 'SOLD', 'ARCHIVED']) {
      expect(ListingStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(ListingStatusSchema.safeParse('live').success).toBe(false);
    expect(ListingStatusSchema.safeParse('EXPIRED').success).toBe(false);
  });
});
