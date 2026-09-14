import { describe, expect, it } from 'vitest';
import { EquipmentSchema } from './equipment';

describe('EquipmentSchema', () => {
  it('accepts a valid equipment item', () => {
    const result = EquipmentSchema.safeParse({
      id: 'carbon_bucket_seats',
      name: 'Carbon Bucket Seats',
      category: 'Seats',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty category', () => {
    const result = EquipmentSchema.safeParse({
      id: 'carbon_bucket_seats',
      name: 'Carbon Bucket Seats',
      category: '',
    });
    expect(result.success).toBe(false);
  });
});
