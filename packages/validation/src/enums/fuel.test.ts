import { describe, expect, it } from 'vitest';
import { FuelTypeSchema } from './fuel';

describe('FuelTypeSchema', () => {
  it('accepts every documented fuel type', () => {
    for (const value of ['PETROL', 'DIESEL', 'HYBRID', 'PHEV', 'ELECTRIC', 'HYDROGEN']) {
      expect(FuelTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(FuelTypeSchema.safeParse('petrol').success).toBe(false);
    expect(FuelTypeSchema.safeParse('BIODIESEL').success).toBe(false);
  });
});
