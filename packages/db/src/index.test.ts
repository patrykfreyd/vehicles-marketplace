import { describe, expect, it } from 'vitest';
import { db, ListingStatus } from './index';

describe('index', () => {
  it('re-exports the db singleton and generated Prisma types/enums', () => {
    // A generated enum's values, not just its TS type, prove the schema's
    // models actually made it through `prisma generate` and out through
    // this package's re-export — not just that `@prisma/client` itself
    // resolves.
    expect(ListingStatus.DRAFT).toBe('DRAFT');
    expect(typeof db.user.findMany).toBe('function');
  });
});
