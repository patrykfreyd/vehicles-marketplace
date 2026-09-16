import { describe, expect, it } from 'vitest';
import { HttpException, type ExecutionContext } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { DVLA_LOOKUP_DAILY_LIMIT, DvlaLookupThrottleGuard } from './dvla-lookup-throttle.guard';

/** In-memory stand-in for the two ioredis calls this guard uses — same shape as auth-rate-limit.hook.test.ts's fake. */
function buildFakeRedis(): Redis {
  const counts = new Map<string, number>();
  return {
    incr: async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    expire: async () => 1,
  } as unknown as Redis;
}

function buildContext(user: CurrentUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const user: CurrentUser = {
  id: 'usr_1',
  email: 'jane@example.com',
  emailVerified: true,
  displayName: 'Jane',
  isAdmin: false,
};

describe('DvlaLookupThrottleGuard', () => {
  it('allows requests up to the daily limit', async () => {
    const redis = buildFakeRedis();
    const guard = new DvlaLookupThrottleGuard(redis);
    for (let i = 0; i < DVLA_LOOKUP_DAILY_LIMIT; i++) {
      await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
    }
  });

  it('rejects the request beyond the daily limit with a 429', async () => {
    const redis = buildFakeRedis();
    const guard = new DvlaLookupThrottleGuard(redis);
    for (let i = 0; i < DVLA_LOOKUP_DAILY_LIMIT; i++) {
      await guard.canActivate(buildContext(user));
    }
    await expect(guard.canActivate(buildContext(user))).rejects.toThrow(HttpException);
    try {
      await guard.canActivate(buildContext(user));
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('tracks a different user independently', async () => {
    const redis = buildFakeRedis();
    const guard = new DvlaLookupThrottleGuard(redis);
    for (let i = 0; i < DVLA_LOOKUP_DAILY_LIMIT; i++) {
      await guard.canActivate(buildContext(user));
    }
    await expect(guard.canActivate(buildContext({ ...user, id: 'usr_2' }))).resolves.toBe(true);
  });

  it('does nothing when there is no authenticated user on the request', async () => {
    const redis = buildFakeRedis();
    const guard = new DvlaLookupThrottleGuard(redis);
    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
  });
});
