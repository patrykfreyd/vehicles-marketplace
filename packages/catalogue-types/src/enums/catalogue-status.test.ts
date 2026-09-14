import { describe, expect, it } from 'vitest';
import { CatalogueStatusSchema } from './catalogue-status';

describe('CatalogueStatusSchema', () => {
  it('accepts every documented status', () => {
    for (const value of [
      'IMPORTED',
      'AI_DRAFT',
      'REVIEW_REQUIRED',
      'SOURCE_CONFIRMED',
      'APPROVED',
      'DEPRECATED',
    ]) {
      expect(CatalogueStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(CatalogueStatusSchema.safeParse('approved').success).toBe(false);
    expect(CatalogueStatusSchema.safeParse('PENDING').success).toBe(false);
  });
});
