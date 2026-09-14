import { describe, expect, it } from 'vitest';
import { CatalogueEntityTypeSchema } from './catalogue-entity-type';

describe('CatalogueEntityTypeSchema', () => {
  it('accepts every documented entity type', () => {
    for (const value of [
      'MAKE',
      'MODEL',
      'GENERATION',
      'DERIVATIVE',
      'ENGINE_FAMILY',
      'MANUFACTURER_COLOUR',
    ]) {
      expect(CatalogueEntityTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(CatalogueEntityTypeSchema.safeParse('make').success).toBe(false);
    expect(CatalogueEntityTypeSchema.safeParse('EQUIPMENT').success).toBe(false);
  });
});
