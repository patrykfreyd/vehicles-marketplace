import { describe, expect, it } from 'vitest';
import { EquipmentSourceSchema } from './equipment-source';

describe('EquipmentSourceSchema', () => {
  it('accepts every documented value', () => {
    for (const value of ['SELLER_DECLARED', 'AI_DETECTED']) {
      expect(EquipmentSourceSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(EquipmentSourceSchema.safeParse('seller_declared').success).toBe(false);
    expect(EquipmentSourceSchema.safeParse('MANUAL').success).toBe(false);
  });
});
