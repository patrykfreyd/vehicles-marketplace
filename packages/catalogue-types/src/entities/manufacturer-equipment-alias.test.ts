import { describe, expect, it } from 'vitest';
import { ManufacturerEquipmentAliasSchema } from './manufacturer-equipment-alias';

describe('ManufacturerEquipmentAliasSchema', () => {
  it('accepts a valid manufacturer equipment alias', () => {
    const result = ManufacturerEquipmentAliasSchema.safeParse({
      id: 'mea_01HZX82K7Q4M',
      equipmentId: 'carbon_bucket_seats',
      makeId: 'bmw',
      manufacturerName: 'M Carbon Bucket Seats',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-slug makeId', () => {
    const result = ManufacturerEquipmentAliasSchema.safeParse({
      id: 'mea_01HZX82K7Q4M',
      equipmentId: 'carbon_bucket_seats',
      makeId: 'BMW',
      manufacturerName: 'M Carbon Bucket Seats',
    });
    expect(result.success).toBe(false);
  });
});
