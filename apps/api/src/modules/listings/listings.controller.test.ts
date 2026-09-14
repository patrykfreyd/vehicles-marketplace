import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ListingsController } from './listings.controller';

describe('ListingsController (Plan 07 acceptance-criterion stub)', () => {
  it('guards `create` with EmailVerifiedGuard — the actual mechanism proving §10\'s "unverified email is rejected" criterion (see email-verified.guard.test.ts for the rejection behavior itself)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ListingsController.prototype.create) as
      unknown[] | undefined;
    expect(guards).toContain(EmailVerifiedGuard);
  });

  it('echoes the authenticated seller id back once past the guard', () => {
    const controller = new ListingsController();
    const user: CurrentUser = {
      id: 'usr_1',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane',
      isAdmin: false,
    };
    expect(controller.create(user)).toEqual({ sellerId: 'usr_1' });
  });
});
