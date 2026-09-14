import { describe, expect, it } from 'vitest';
import { CatalogueSourceSchema } from './catalogue-source';

describe('CatalogueSourceSchema', () => {
  it('accepts a fully populated source', () => {
    const result = CatalogueSourceSchema.safeParse({
      id: 'src_01HZX82K7Q4M',
      name: 'BMW UK press pack 2023',
      url: 'https://press.bmw.co.uk/m4',
      licenseNote: 'Public press material, attribution not required',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a source with no url/licenseNote', () => {
    const result = CatalogueSourceSchema.safeParse({
      id: 'src_01HZX82K7Q4M',
      name: 'BMW UK press pack 2023',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = CatalogueSourceSchema.safeParse({
      id: 'src_01HZX82K7Q4M',
      name: '',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
