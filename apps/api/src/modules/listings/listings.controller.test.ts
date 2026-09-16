import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ListingsController } from './listings.controller';

describe('ListingsController', () => {
  it.each(['create', 'update', 'updateStatus'] as const)(
    '%s requires EmailVerifiedGuard (Plan 07 §10)',
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, ListingsController.prototype[method]) as
        unknown[] | undefined;
      expect(guards).toContain(EmailVerifiedGuard);
    },
  );

  it.each(['list', 'getById'] as const)(
    '%s stays open to an authenticated but unverified user (reading is never gated)',
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, ListingsController.prototype[method]) as
        unknown[] | undefined;
      expect(guards ?? []).not.toContain(EmailVerifiedGuard);
    },
  );
});
