import { describe, expect, it } from 'vitest';
import { CatalogueValidationIssueSchema } from './catalogue-validation-issue';

describe('CatalogueValidationIssueSchema', () => {
  it('accepts a WARNING issue against a DERIVATIVE, defaulting resolved to false', () => {
    const result = CatalogueValidationIssueSchema.safeParse({
      id: 'issue_01HZX82K7Q4M',
      importId: 'imp_01HZX82K7Q4M',
      entityType: 'DERIVATIVE',
      entityId: 'bmw-m4-g82-competition-xdrive',
      severity: 'WARNING',
      message: 'Missing torqueNm',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.resolved).toBe(false);
  });

  it('accepts an ERROR issue explicitly marked resolved', () => {
    const result = CatalogueValidationIssueSchema.safeParse({
      id: 'issue_01HZX82K7Q4M',
      importId: 'imp_01HZX82K7Q4M',
      entityType: 'GENERATION',
      entityId: 'bmw-m4-g82',
      severity: 'ERROR',
      message: 'Duplicate generation code',
      resolved: true,
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown severity', () => {
    const result = CatalogueValidationIssueSchema.safeParse({
      id: 'issue_01HZX82K7Q4M',
      importId: 'imp_01HZX82K7Q4M',
      entityType: 'DERIVATIVE',
      entityId: 'bmw-m4-g82-competition-xdrive',
      severity: 'CRITICAL',
      message: 'Missing torqueNm',
    });
    expect(result.success).toBe(false);
  });
});
