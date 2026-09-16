import { describe, expect, it } from 'vitest';
import { ModificationCategorySchema } from './modification-category';

describe('ModificationCategorySchema', () => {
  it('accepts every documented value', () => {
    for (const value of [
      'ECU_TUNE',
      'EXHAUST',
      'INTAKE',
      'FORCED_INDUCTION',
      'SUSPENSION',
      'BRAKES',
      'WHEELS',
      'BODYWORK',
      'INTERIOR',
      'AUDIO',
      'OTHER',
    ]) {
      expect(ModificationCategorySchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(ModificationCategorySchema.safeParse('exhaust').success).toBe(false);
    expect(ModificationCategorySchema.safeParse('TURBO').success).toBe(false);
  });
});
