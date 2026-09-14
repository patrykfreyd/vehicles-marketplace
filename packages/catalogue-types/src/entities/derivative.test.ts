import { describe, expect, it } from 'vitest';
import { DerivativeRecordSchema, DerivativeSchema } from './derivative';

const baseDerivative = {
  id: 'bmw-m4-g82-competition-xdrive',
  generationId: 'bmw-m4-g82',
  name: 'M4 Competition xDrive',
  bodyStyle: 'COUPE',
  fuel: 'PETROL',
  drivetrain: 'AWD',
};

describe('DerivativeSchema', () => {
  it('accepts the minimal required fields, defaulting the rest', () => {
    const result = DerivativeSchema.safeParse(baseDerivative);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transmissions).toEqual([]);
      expect(result.data.status).toBe('AI_DRAFT');
      expect(result.data.reviewed).toBe(false);
      expect(result.data.completenessScore).toBe(0);
      expect(result.data.aliases).toEqual([]);
      expect(result.data.specialEdition).toBe(false);
    }
  });

  it('accepts a fully populated Level 2 derivative', () => {
    const result = DerivativeSchema.safeParse({
      ...baseDerivative,
      engineCapacityCc: 2993,
      cylinders: 6,
      configuration: 'INLINE_6',
      aspiration: 'TWIN_TURBO',
      engineFamily: 'S58',
      powerBhp: 503,
      torqueNm: 650,
      transmissions: ['AUTOMATIC'],
      drivetrainManufacturerName: 'M xDrive',
      zeroToSixtyTwoSeconds: 3.5,
      topSpeedMph: 180,
      status: 'SOURCE_CONFIRMED',
      confidence: 0.95,
      reviewed: true,
      completenessScore: 100,
      aliases: ['M4 Comp xDrive', 'G82 Comp xDrive'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid enum value', () => {
    expect(DerivativeSchema.safeParse({ ...baseDerivative, fuel: 'PETROL_DIESEL' }).success).toBe(
      false,
    );
  });

  it('rejects a missing required field', () => {
    const { drivetrain: _drivetrain, ...withoutDrivetrain } = baseDerivative;
    expect(DerivativeSchema.safeParse(withoutDrivetrain).success).toBe(false);
  });
});

describe('DerivativeRecordSchema', () => {
  it('accepts a Derivative with its Prisma-managed timestamps', () => {
    const result = DerivativeRecordSchema.safeParse({
      ...baseDerivative,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a record missing updatedAt', () => {
    const result = DerivativeRecordSchema.safeParse({
      ...baseDerivative,
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
