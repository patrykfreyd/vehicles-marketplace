import { describe, expect, it } from 'vitest';
import { mapDvlaFuelType } from './fuel-mapping';

describe('mapDvlaFuelType', () => {
  it('maps exact matches case-insensitively', () => {
    expect(mapDvlaFuelType('PETROL')).toBe('PETROL');
    expect(mapDvlaFuelType('diesel')).toBe('DIESEL');
    expect(mapDvlaFuelType('Electricity')).toBe('ELECTRIC');
    expect(mapDvlaFuelType('HYDROGEN')).toBe('HYDROGEN');
  });

  it('maps any hybrid-flavoured string to HYBRID', () => {
    expect(mapDvlaFuelType('HYBRID ELECTRIC (PETROL/ELECTRIC)')).toBe('HYBRID');
  });

  it('returns null for an unrecognized value', () => {
    expect(mapDvlaFuelType('GAS BI-FUEL')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(mapDvlaFuelType(undefined)).toBeNull();
  });
});
