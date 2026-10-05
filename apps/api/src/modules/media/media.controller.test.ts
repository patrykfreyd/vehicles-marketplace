import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { MediaController } from './media.controller';

describe('MediaController', () => {
  it.each(['upload', 'reorder', 'updateCategory', 'remove', 'retry'] as const)(
    '%s requires EmailVerifiedGuard (Plan 07 §10, every mutating route)',
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, MediaController.prototype[method]) as
        unknown[] | undefined;
      expect(guards).toContain(EmailVerifiedGuard);
    },
  );

  it.each(['list', 'coverage'] as const)(
    '%s stays open to an authenticated but unverified owner/admin (reading is never gated)',
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, MediaController.prototype[method]) as
        unknown[] | undefined;
      expect(guards ?? []).not.toContain(EmailVerifiedGuard);
    },
  );
});
