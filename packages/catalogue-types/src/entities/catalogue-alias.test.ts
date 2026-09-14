import { describe, expect, it } from 'vitest';
import { CatalogueAliasSchema } from './catalogue-alias';

describe('CatalogueAliasSchema', () => {
  it('accepts an alias for a GENERATION entity', () => {
    const result = CatalogueAliasSchema.safeParse({
      id: 'alias_01HZX82K7Q4M',
      entityType: 'GENERATION',
      entityId: 'bmw-m4-g82',
      alias: 'G82 M4',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an alias for a DERIVATIVE entity (a different entityType, same shape)', () => {
    const result = CatalogueAliasSchema.safeParse({
      id: 'alias_01HZYC421Q',
      entityType: 'DERIVATIVE',
      entityId: 'bmw-m4-g82-competition-xdrive',
      alias: 'M4 Comp xDrive',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown entityType', () => {
    const result = CatalogueAliasSchema.safeParse({
      id: 'alias_01HZYC421Q',
      entityType: 'VEHICLE',
      entityId: 'bmw-m4-g82',
      alias: 'G82 M4',
    });
    expect(result.success).toBe(false);
  });
});
