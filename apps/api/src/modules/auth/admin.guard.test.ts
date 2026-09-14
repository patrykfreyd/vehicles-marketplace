import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { AdminGuard } from './admin.guard';

function buildContext(user: CurrentUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const baseUser: CurrentUser = {
  id: 'usr_1',
  email: 'jane@example.com',
  emailVerified: true,
  displayName: 'Jane',
  isAdmin: false,
};

describe('AdminGuard', () => {
  it('allows an admin user through', () => {
    const guard = new AdminGuard();
    expect(guard.canActivate(buildContext({ ...baseUser, isAdmin: true }))).toBe(true);
  });

  it('rejects a non-admin user with 403', () => {
    const guard = new AdminGuard();
    expect(() => guard.canActivate(buildContext(baseUser))).toThrow(ForbiddenException);
  });

  it('rejects when there is no user on the request', () => {
    const guard = new AdminGuard();
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
