/**
 * Checks Redis connectivity for `GET /api/v1/health` — see
 * postgres-health.indicator.ts for why this opens a fresh connection per
 * check rather than sharing a persistent client.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import type { Env } from '@vehicles-marketplace/config';

const CHECK_TIMEOUT_MS = 3_000;

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const redis = new Redis(this.configService.get('REDIS_URL', { infer: true }), {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        try {
          await redis.connect();
          await redis.ping();
        } finally {
          redis.disconnect();
        }
      })
      .withTimeout(CHECK_TIMEOUT_MS);
  }
}
