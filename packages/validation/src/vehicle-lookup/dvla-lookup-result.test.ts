import { describe, expect, it } from 'vitest';
import { DvlaLookupResultSchema } from './dvla-lookup-result';

const valid = {
  id: 'vlk_01',
  registration: 'YA22GZX',
  make: 'BMW',
  matchedMakeId: 'bmw',
  yearOfManufacture: 2022,
  engineCapacityCc: 2993,
  fuel: 'PETROL',
  rawFuelType: 'PETROL',
  colour: 'BLUE',
  taxStatus: 'Taxed',
  motStatus: 'Valid',
  motExpiryDate: '2027-03-01',
};

describe('DvlaLookupResultSchema', () => {
  it('accepts a fully-populated result', () => {
    expect(DvlaLookupResultSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts nulls for fields DVLA can legitimately omit', () => {
    expect(
      DvlaLookupResultSchema.safeParse({
        ...valid,
        matchedMakeId: null,
        engineCapacityCc: null,
        fuel: null,
        rawFuelType: null,
        colour: null,
        motStatus: null,
        motExpiryDate: null,
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid fuel value', () => {
    expect(DvlaLookupResultSchema.safeParse({ ...valid, fuel: 'PIXIE_DUST' }).success).toBe(false);
  });
});
