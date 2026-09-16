/**
 * plans/10-dvla-lookup-seller-matching.md §5 — a strict per-user daily
 * throttle on `POST /vehicle-lookup/dvla`, layered on top of Plan 05's
 * global `ThrottlerGuard` default (100/min/IP, too loose for this
 * specifically-worth-limiting endpoint). Confirmed at 20/day (§9.3).
 *
 * Can't be `@nestjs/throttler`'s own `@Throttle()`: that guard's default
 * in-memory storage tracks per-IP, resets on process restart, and isn't
 * shared across `apps/api` instances — wrong on all three counts for a
 * per-*user*, day-long, multi-instance-safe limit. Same fixed-window-via-
 * Redis approach as `auth-rate-limit.hook.ts` (Plan 07 §8), just as a Nest
 * `CanActivate` instead of a Better Auth hook, since this route *does* run
 * through Nest's guard pipeline (unlike `/api/v1/auth/*`).
 *
 * Keyed by the UTC calendar date rather than a rolling 24h window: simpler,
 * and "20 lookups per day" reads naturally as "resets at midnight" to a
 * seller, not "20 per rolling 24h from your first lookup".
 */
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Redis } from 'ioredis';
import { REDIS } from '../../common/redis/redis.module';

export const DVLA_LOOKUP_DAILY_LIMIT = 20;
const WINDOW_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class DvlaLookupThrottleGuard implements CanActivate {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // AuthGuard runs globally, before this route-level guard, and always
    // sets `req.user` for a non-@Public() route — see auth.guard.ts.
    const userId = request.user?.id;
    if (!userId) return true;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
    const key = `dvla-lookup:${userId}:${today}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, WINDOW_TTL_SECONDS);
    }
    if (count > DVLA_LOOKUP_DAILY_LIMIT) {
      throw new HttpException(
        "You've reached today's registration lookup limit. Try again tomorrow.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
