import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';
import type { PostgresHealthIndicator } from './indicators/postgres-health.indicator';
import type { RedisHealthIndicator } from './indicators/redis-health.indicator';

describe('HealthService', () => {
  it('returns one indicator function per dependency, each calling isHealthy with its own key', () => {
    const postgresResult = { postgres: { status: 'up' as const } };
    const redisResult = { redis: { status: 'up' as const } };
    const postgres = {
      isHealthy: vi.fn().mockReturnValue(postgresResult),
    } as unknown as PostgresHealthIndicator;
    const redis = {
      isHealthy: vi.fn().mockReturnValue(redisResult),
    } as unknown as RedisHealthIndicator;

    // Cast to a plain callable form: HealthIndicatorFunction's declared type
    // also allows a bare (non-function) HealthCheckAttempt value, but this
    // service always returns the `() => ...` form.
    const [checkPostgres, checkRedis] = new HealthService(postgres, redis).getIndicators() as Array<
      () => unknown
    >;

    expect(checkPostgres!()).toBe(postgresResult);
    expect(postgres.isHealthy).toHaveBeenCalledWith('postgres');

    expect(checkRedis!()).toBe(redisResult);
    expect(redis.isHealthy).toHaveBeenCalledWith('redis');
  });
});
