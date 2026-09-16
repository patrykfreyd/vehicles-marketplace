import { describe, expect, it } from 'vitest';
import { CreateListingRequestSchema } from './create-listing-request';

describe('CreateListingRequestSchema', () => {
  it('accepts the minimum required fields, defaulting locationCountry to GB', () => {
    const result = CreateListingRequestSchema.safeParse({
      vehicleId: 'veh_01',
      pricePence: 2649500,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.locationCountry).toBe('GB');
  });

  it('rejects a missing vehicleId', () => {
    expect(CreateListingRequestSchema.safeParse({ pricePence: 100 }).success).toBe(false);
  });

  it('rejects a non-integer or negative price', () => {
    expect(
      CreateListingRequestSchema.safeParse({ vehicleId: 'veh_01', pricePence: 100.5 }).success,
    ).toBe(false);
    expect(
      CreateListingRequestSchema.safeParse({ vehicleId: 'veh_01', pricePence: -1 }).success,
    ).toBe(false);
  });
});
