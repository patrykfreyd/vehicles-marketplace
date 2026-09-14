import { describe, expect, it } from 'vitest';
import { PublishedDerivativeSchema } from './published-derivative';

describe('PublishedDerivativeSchema', () => {
  it('accepts a derivative with its make/model/generation context', () => {
    const result = PublishedDerivativeSchema.safeParse({
      id: 'bmw-m4-g82-competition-xdrive',
      generationId: 'bmw-m4-g82',
      name: 'M4 Competition xDrive',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'AWD',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      makeName: 'BMW',
      modelName: 'M4',
      generationCode: 'G82',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing generationCode', () => {
    const result = PublishedDerivativeSchema.safeParse({
      id: 'bmw-m4-g82-competition-xdrive',
      generationId: 'bmw-m4-g82',
      name: 'M4 Competition xDrive',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'AWD',
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
      makeName: 'BMW',
      modelName: 'M4',
    });
    expect(result.success).toBe(false);
  });
});
