import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { EmailVerifiedGuard } from './email-verified.guard';

function buildContext(user: CurrentUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const baseUser: CurrentUser = {
  id: 'usr_1',
  email: 'jane@example.com',
  emailVerified: false,
  displayName: 'Jane',
  isAdmin: false,
};

describe('EmailVerifiedGuard', () => {
  it('allows a verified user through', () => {
    const guard = new EmailVerifiedGuard();
    expect(guard.canActivate(buildContext({ ...baseUser, emailVerified: true }))).toBe(true);
  });

  it('rejects an unverified user with a toast-ready message', () => {
    const guard = new EmailVerifiedGuard();
    expect(() => guard.canActivate(buildContext(baseUser))).toThrow(ForbiddenException);
    try {
      guard.canActivate(buildContext(baseUser));
    } catch (error) {
      expect((error as ForbiddenException).message).toBe('Verify your email to do this.');
    }
  });
});
