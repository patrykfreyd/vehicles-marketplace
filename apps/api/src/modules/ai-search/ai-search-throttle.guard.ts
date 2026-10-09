import {
  Inject,
  Injectable,
  HttpException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { REDIS } from '../../common/redis/redis.module';

// Atomic sliding hour shared by both features, all sessions and API instances.
export const AI_RATE_LIMIT_SCRIPT = `
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 3600000)
if redis.call('ZCARD', KEYS[1]) >= 60 then return 0 end
redis.call('ZADD', KEYS[1], now, ARGV[2])
redis.call('PEXPIRE', KEYS[1], 3600000)
return 1`;

@Injectable()
export class AiSearchThrottleGuard implements CanActivate {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) throw new UnauthorizedException();
    const allowed = await this.redis.eval(
      AI_RATE_LIMIT_SCRIPT,
      1,
      `AI_SEARCH_RATE:${request.user.id}`,
      Date.now(),
      randomUUID(),
    );
    if (allowed !== 1)
      throw new HttpException(
        'You have reached the limit of 60 AI messages per hour. Try regular search or return later.',
        429,
      );
    return true;
  }
}
