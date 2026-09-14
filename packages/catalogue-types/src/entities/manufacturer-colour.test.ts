import { describe, expect, it } from 'vitest';
import { ManufacturerColourSchema } from './manufacturer-colour';

describe('ManufacturerColourSchema', () => {
  it('accepts a valid manufacturer colour with aliases', () => {
    const result = ManufacturerColourSchema.safeParse({
      id: 'bmw-marina-bay-blue-metallic',
      makeId: 'bmw',
      name: 'Marina Bay Blue Metallic',
      family: 'BLUE',
      paintCode: 'C1K',
      aliases: ['Marina Bay Blue', 'MBB'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown colour family', () => {
    const result = ManufacturerColourSchema.safeParse({
      id: 'bmw-marina-bay-blue-metallic',
      makeId: 'bmw',
      name: 'Marina Bay Blue Metallic',
      family: 'NAVY',
    });
    expect(result.success).toBe(false);
  });
});
