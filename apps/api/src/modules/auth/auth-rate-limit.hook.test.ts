import { describe, expect, it } from 'vitest';
import type { Redis } from 'ioredis';
import { checkAuthRateLimit, type AuthRateLimitContext } from './auth-rate-limit.hook';

/** In-memory stand-in for the two ioredis calls this hook uses. */
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

function buildContext(overrides: Partial<AuthRateLimitContext> = {}): AuthRateLimitContext {
  return {
    path: '/sign-in/email',
    body: { email: 'jane@example.com', password: 'x' },
    context: { options: {} },
    ...overrides,
  };
}

describe('checkAuthRateLimit', () => {
  it('does nothing for a path with no configured rule', async () => {
    const redis = buildFakeRedis();
    await expect(
      checkAuthRateLimit(buildContext({ path: '/get-session' }), redis),
    ).resolves.toBeUndefined();
  });

  it('allows requests under the limit', async () => {
    const redis = buildFakeRedis();
    for (let i = 0; i < 5; i++) {
      await expect(checkAuthRateLimit(buildContext(), redis)).resolves.toBeUndefined();
    }
  });

  it('rejects the 6th sign-in attempt for the same IP+email within the window', async () => {
    const redis = buildFakeRedis();
    for (let i = 0; i < 5; i++) {
      await checkAuthRateLimit(buildContext(), redis);
    }
    await expect(checkAuthRateLimit(buildContext(), redis)).rejects.toThrow();
  });

  it('tracks a different email under a different limit, independent of the first', async () => {
    const redis = buildFakeRedis();
    for (let i = 0; i < 5; i++) {
      await checkAuthRateLimit(buildContext(), redis);
    }
    await expect(
      checkAuthRateLimit(
        buildContext({ body: { email: 'other@example.com', password: 'x' } }),
        redis,
      ),
    ).resolves.toBeUndefined();
  });
});
