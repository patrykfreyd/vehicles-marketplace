import { describe, expect, it } from 'vitest';
import { ConfirmVehicleLookupRequestSchema } from './confirm';

describe('ConfirmVehicleLookupRequestSchema', () => {
  it('defaults matchedManually to false', () => {
    const result = ConfirmVehicleLookupRequestSchema.safeParse({ derivativeId: 'bmw-m4-g82' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.matchedManually).toBe(false);
  });

  it('rejects a missing derivativeId', () => {
    expect(ConfirmVehicleLookupRequestSchema.safeParse({}).success).toBe(false);
  });
});
