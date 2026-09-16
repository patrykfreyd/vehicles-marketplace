import { describe, expect, it } from 'vitest';
import { CreateVehicleRequestSchema } from './create-vehicle-request';

describe('CreateVehicleRequestSchema', () => {
  it('accepts the minimum required fields, defaulting ukSupplied/imported/accidentDeclared', () => {
    const result = CreateVehicleRequestSchema.safeParse({
      vehicleLookupId: 'vlk_01',
      mileageMiles: 12_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ukSupplied).toBe(true);
      expect(result.data.imported).toBe(false);
      expect(result.data.accidentDeclared).toBe(false);
    }
  });

  it('rejects a missing vehicleLookupId', () => {
    expect(CreateVehicleRequestSchema.safeParse({ mileageMiles: 100 }).success).toBe(false);
  });

  it('rejects negative mileage', () => {
    expect(
      CreateVehicleRequestSchema.safeParse({ vehicleLookupId: 'vlk_01', mileageMiles: -1 }).success,
    ).toBe(false);
  });

  it('never accepts registration, derivativeId, or DVLA-sourced fields — the service copies those off the lookup', () => {
    const result = CreateVehicleRequestSchema.safeParse({
      vehicleLookupId: 'vlk_01',
      mileageMiles: 100,
      registration: 'YA22XYZ',
      derivativeId: 'bmw-m4-g82',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('registration');
      expect(result.data).not.toHaveProperty('derivativeId');
    }
  });
});
