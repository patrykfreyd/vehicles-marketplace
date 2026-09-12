import { describe, expect, it } from 'vitest';
import { BodyStyleSchema } from './body-style';

describe('BodyStyleSchema', () => {
  it('accepts every documented body style', () => {
    for (const value of [
      'HATCHBACK',
      'SALOON',
      'ESTATE',
      'COUPE',
      'CONVERTIBLE',
      'SUV',
      'MPV',
      'PICKUP',
    ]) {
      expect(BodyStyleSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(BodyStyleSchema.safeParse('suv').success).toBe(false);
    expect(BodyStyleSchema.safeParse('CROSSOVER').success).toBe(false);
  });
});
