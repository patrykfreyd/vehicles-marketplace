/**
 * plans/07-authentication-authorization.md §8 — tighter, endpoint-specific
 * throttle rules on top of Plan 05's global `ThrottlerGuard` default:
 *
 *   POST /auth/sign-in            5 attempts / 15 min per IP+email
 *   POST /auth/sign-up            10 / hour per IP
 *   POST /auth/forgot-password     5 / hour per IP+email
 *
 * This can't be a Nest `ThrottlerGuard` override: `/api/v1/auth/*` is
 * mounted as raw Express middleware *before* Nest's router (see main.ts's
 * comment for why), so it never reaches Nest's guard pipeline at all. It
 * also can't be Better Auth's own built-in `rateLimit` option: that keys
 * purely by IP+path, and §8 explicitly wants IP+email — one leaked/guessed
 * password shouldn't let an attacker exhaust a victim's whole IP-scoped
 * budget for every *other* email too. So this is a `hooks.before` on the
 * Better Auth instance itself instead, using the shared Redis client
 * (common/redis/redis.module.ts) as a simple fixed-window counter.
 */
import { APIError, createAuthMiddleware, getIP, type AuthMiddleware } from 'better-auth/api';
import type { Redis } from 'ioredis';

interface RateLimitRule {
  windowSeconds: number;
  max: number;
}

// Google's OAuth callback and session-refresh routes are deliberately
// absent — §8: "not credential-guessing surfaces."
const RULES: Record<string, RateLimitRule> = {
  '/sign-in/email': { windowSeconds: 15 * 60, max: 5 },
  '/sign-up/email': { windowSeconds: 60 * 60, max: 10 },
  '/request-password-reset': { windowSeconds: 60 * 60, max: 5 },
};

/** The minimal slice of Better Auth's `createAuthMiddleware` context this
 * hook reads — narrowed to a plain interface so the logic below is testable
 * without going through `better-call`'s real middleware dispatch. */
export interface AuthRateLimitContext {
  path: string;
  body?: unknown;
  request?: Request;
  headers?: Headers;
  context: { options: Parameters<typeof getIP>[1] };
}

/** The actual check, factored out of `createAuthMiddleware(...)` so it can
 * be unit-tested directly against a plain fabricated context. */
export async function checkAuthRateLimit(ctx: AuthRateLimitContext, redis: Redis): Promise<void> {
  const rule = RULES[ctx.path];
  if (!rule) return;

  const ip = getIP(ctx.request ?? ctx.headers ?? new Headers(), ctx.context.options) ?? 'unknown';
  const body = ctx.body;
  const email =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { email?: unknown }).email === 'string'
      ? (body as { email: string }).email.toLowerCase()
      : 'unknown';
  const key = `auth-rl:${ctx.path}:${ip}:${email}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, rule.windowSeconds);
  }
  if (count > rule.max) {
    throw new APIError('TOO_MANY_REQUESTS', {
      message: 'Too many attempts. Please try again later.',
    });
  }
}

export function buildAuthRateLimitHook(redis: Redis): AuthMiddleware {
  return createAuthMiddleware(async (ctx) => {
    await checkAuthRateLimit(ctx as unknown as AuthRateLimitContext, redis);
  });
}
