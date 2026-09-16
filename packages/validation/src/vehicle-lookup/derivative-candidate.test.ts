import { describe, expect, it } from 'vitest';
import {
  DerivativeCandidateSchema,
  ListDerivativeCandidatesQuerySchema,
} from './derivative-candidate';

describe('DerivativeCandidateSchema', () => {
  it('accepts a valid candidate', () => {
    expect(
      DerivativeCandidateSchema.safeParse({
        id: 'bmw-m4-g82-competition-xdrive',
        name: 'M4 Competition xDrive',
        generationId: 'bmw-m4-g82',
        generationCode: 'G82',
        fuel: 'PETROL',
        engineCapacityCc: 2993,
        powerBhp: 503,
        drivetrain: 'AWD',
        transmissions: ['AUTOMATIC'],
        bodyStyle: 'COUPE',
        engineCapacityDiffCc: 0,
        withinTolerance: true,
      }).success,
    ).toBe(true);
  });
});

describe('ListDerivativeCandidatesQuerySchema', () => {
  it('requires modelId', () => {
    expect(ListDerivativeCandidatesQuerySchema.safeParse({}).success).toBe(false);
  });
});
