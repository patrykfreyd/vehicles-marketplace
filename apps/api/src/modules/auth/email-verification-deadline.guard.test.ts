import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import {
  EMAIL_VERIFICATION_GRACE_PERIOD_MS,
  EmailVerificationDeadlineGuard,
} from './email-verification-deadline.guard';

function buildContext(user: CurrentUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const unverifiedUser: CurrentUser = {
  id: 'usr_1',
  email: 'jane@example.com',
  emailVerified: false,
  displayName: 'Jane',
  isAdmin: false,
};

function buildDb(createdAt: Date | null): PrismaClient {
  return {
    user: { findUnique: vi.fn().mockResolvedValue(createdAt ? { createdAt } : null) },
  } as unknown as PrismaClient;
}

describe('EmailVerificationDeadlineGuard', () => {
  it('allows a verified user through without querying the database', async () => {
    const db = buildDb(new Date());
    const guard = new EmailVerificationDeadlineGuard(db);
    await expect(
      guard.canActivate(buildContext({ ...unverifiedUser, emailVerified: true })),
    ).resolves.toBe(true);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows an unrouted request with no user through', async () => {
    const guard = new EmailVerificationDeadlineGuard(buildDb(new Date()));
    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
  });

  it('allows an unverified user within the 7-day grace period', async () => {
    const createdAt = new Date(Date.now() - 1000);
    const guard = new EmailVerificationDeadlineGuard(buildDb(createdAt));
    await expect(guard.canActivate(buildContext(unverifiedUser))).resolves.toBe(true);
  });

  it('rejects an unverified user once 7 days have passed', async () => {
    const createdAt = new Date(Date.now() - EMAIL_VERIFICATION_GRACE_PERIOD_MS - 1000);
    const guard = new EmailVerificationDeadlineGuard(buildDb(createdAt));
    await expect(guard.canActivate(buildContext(unverifiedUser))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows through when the user row no longer exists (stale session)', async () => {
    const guard = new EmailVerificationDeadlineGuard(buildDb(null));
    await expect(guard.canActivate(buildContext(unverifiedUser))).resolves.toBe(true);
  });
});
