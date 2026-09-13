import { Injectable } from '@nestjs/common';
import type { HealthIndicatorFunction } from '@nestjs/terminus';
import { PostgresHealthIndicator } from './indicators/postgres-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

@Injectable()
export class HealthService {
  constructor(
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  getIndicators(): HealthIndicatorFunction[] {
    return [() => this.postgres.isHealthy('postgres'), () => this.redis.isHealthy('redis')];
  }
}
