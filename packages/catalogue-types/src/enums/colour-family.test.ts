import { describe, expect, it } from 'vitest';
import { ColourFamilySchema } from './colour-family';

describe('ColourFamilySchema', () => {
  it('accepts every documented colour family', () => {
    for (const value of [
      'BLACK',
      'WHITE',
      'BLUE',
      'RED',
      'GREEN',
      'GREY',
      'SILVER',
      'YELLOW',
      'ORANGE',
      'PURPLE',
      'BROWN',
      'BEIGE',
    ]) {
      expect(ColourFamilySchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(ColourFamilySchema.safeParse('blue').success).toBe(false);
    expect(ColourFamilySchema.safeParse('GRAY').success).toBe(false);
  });
});
