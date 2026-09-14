import { describe, expect, it } from 'vitest';
import { CatalogueImportSchema } from './catalogue-import';

describe('CatalogueImportSchema', () => {
  it('accepts a CLI-only run with no importedBy/issues', () => {
    const result = CatalogueImportSchema.safeParse({
      id: 'imp_01HZX82K7Q4M',
      manufacturerId: 'bmw',
      filePath: 'catalogue/bmw/m4.json',
      recordsCreated: 3,
      recordsUpdated: 0,
      warningsCount: 0,
      errorsCount: 0,
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a run with an admin importedBy and expanded issues', () => {
    const result = CatalogueImportSchema.safeParse({
      id: 'imp_01HZX82K7Q4M',
      manufacturerId: 'bmw',
      filePath: 'catalogue/bmw/m4.json',
      importedBy: 'usr_01HZX82K7Q4M',
      recordsCreated: 3,
      recordsUpdated: 0,
      warningsCount: 1,
      errorsCount: 0,
      createdAt: '2026-09-14T00:00:00.000Z',
      issues: [
        {
          id: 'issue_01HZX82K7Q4M',
          importId: 'imp_01HZX82K7Q4M',
          entityType: 'DERIVATIVE',
          entityId: 'bmw-m4-f82',
          severity: 'WARNING',
          message: 'Missing zeroToSixtyTwoSeconds',
          resolved: false,
          createdAt: '2026-09-14T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative recordsCreated', () => {
    const result = CatalogueImportSchema.safeParse({
      id: 'imp_01HZX82K7Q4M',
      manufacturerId: 'bmw',
      filePath: 'catalogue/bmw/m4.json',
      recordsCreated: -1,
      recordsUpdated: 0,
      warningsCount: 0,
      errorsCount: 0,
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
