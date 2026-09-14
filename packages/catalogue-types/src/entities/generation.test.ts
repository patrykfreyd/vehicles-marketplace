import { describe, expect, it } from 'vitest';
import { GenerationSchema } from './generation';

describe('GenerationSchema', () => {
  it('accepts a valid generation, defaulting aliases to empty', () => {
    const result = GenerationSchema.safeParse({
      id: 'bmw-m4-g82',
      modelId: 'bmw-m4',
      code: 'G82',
      productionStartYear: 2021,
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.aliases).toEqual([]);
  });

  it('rejects a non-positive production start year', () => {
    const result = GenerationSchema.safeParse({
      id: 'bmw-m4-g82',
      modelId: 'bmw-m4',
      code: 'G82',
      productionStartYear: 0,
    });
    expect(result.success).toBe(false);
  });
});
