import { describe, expect, it } from 'vitest';
import {
  AddAliasRequestSchema,
  AddSourceRequestSchema,
  DerivativeDetailSchema,
  MergeDerivativesRequestSchema,
  UpdateDerivativeRequestSchema,
} from './derivative-detail';

const baseDerivative = {
  id: 'bmw-m4-g82-competition-xdrive',
  generationId: 'bmw-m4-g82',
  name: 'M4 Competition xDrive',
  bodyStyle: 'COUPE',
  fuel: 'PETROL',
  drivetrain: 'AWD',
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
};

describe('DerivativeDetailSchema', () => {
  it('accepts a full detail payload with context, issues, and source links', () => {
    const result = DerivativeDetailSchema.safeParse({
      ...baseDerivative,
      makeId: 'bmw',
      makeName: 'BMW',
      modelId: 'bmw-m4',
      modelName: 'M4',
      generationCode: 'G82',
      issues: [],
      sourceLinks: [],
      aliasRecords: [{ id: 'alias_01HZX82K7Q4M', alias: 'M4 Comp xDrive' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateDerivativeRequestSchema', () => {
  it('accepts a partial edit of one spec field', () => {
    expect(UpdateDerivativeRequestSchema.safeParse({ powerBhp: 510 }).success).toBe(true);
  });

  it('accepts an empty object (no-op edit)', () => {
    expect(UpdateDerivativeRequestSchema.safeParse({}).success).toBe(true);
  });

  it('rejects status — that field is moved only via the approve/reject actions', () => {
    expect(UpdateDerivativeRequestSchema.safeParse({ status: 'APPROVED' }).success).toBe(false);
  });
});

describe('AddAliasRequestSchema', () => {
  it('accepts a non-empty alias', () => {
    expect(AddAliasRequestSchema.safeParse({ alias: 'M4 Comp xDrive' }).success).toBe(true);
  });

  it('rejects an empty alias', () => {
    expect(AddAliasRequestSchema.safeParse({ alias: '' }).success).toBe(false);
  });
});

describe('AddSourceRequestSchema', () => {
  it('accepts a name-only source', () => {
    expect(AddSourceRequestSchema.safeParse({ name: 'BMW UK press pack 2023' }).success).toBe(true);
  });

  it('rejects an invalid url', () => {
    expect(
      AddSourceRequestSchema.safeParse({ name: 'BMW UK press pack 2023', url: 'not-a-url' })
        .success,
    ).toBe(false);
  });
});

describe('MergeDerivativesRequestSchema', () => {
  it('accepts a valid duplicateId', () => {
    expect(
      MergeDerivativesRequestSchema.safeParse({ duplicateId: 'bmw-m4-g82-competition' }).success,
    ).toBe(true);
  });

  it('rejects an empty duplicateId', () => {
    expect(MergeDerivativesRequestSchema.safeParse({ duplicateId: '' }).success).toBe(false);
  });
});
