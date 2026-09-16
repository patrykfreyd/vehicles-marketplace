import { describe, expect, it } from 'vitest';
import { WriteOffCategorySchema } from './write-off-category';

describe('WriteOffCategorySchema', () => {
  it('accepts every documented value', () => {
    for (const value of ['CAT_A', 'CAT_B', 'CAT_S', 'CAT_N']) {
      expect(WriteOffCategorySchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(WriteOffCategorySchema.safeParse('cat_a').success).toBe(false);
    expect(WriteOffCategorySchema.safeParse('CAT_D').success).toBe(false);
  });
});
