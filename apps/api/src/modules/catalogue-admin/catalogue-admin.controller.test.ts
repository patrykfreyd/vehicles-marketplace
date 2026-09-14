import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from '../auth/admin.guard';
import { CatalogueAdminController } from './catalogue-admin.controller';

describe('CatalogueAdminController', () => {
  it('guards every route with AdminGuard (§7: "every route behind AdminGuard")', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CatalogueAdminController) as
      unknown[] | undefined;
    expect(guards).toContain(AdminGuard);
  });
});
