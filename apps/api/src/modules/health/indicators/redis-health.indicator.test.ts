import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Env } from '@vehicles-marketplace/config';
import { RedisHealthIndicator } from './redis-health.indicator';

const { connect, ping, disconnect } = vi.hoisted(() => ({
  connect: vi.fn(),
  ping: vi.fn(),
  disconnect: vi.fn(),
}));
// Hoisted above the imports above by Vitest, so RedisHealthIndicator
// already sees the mocked `ioredis` by the time it's imported. A plain
// `function`, not an arrow function — the source calls `new Redis(...)`,
// and only a function that can be a constructor (or one that explicitly
// returns an object, like this one) works with `new`.
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(function FakeRedis() {
    return { connect, ping, disconnect };
  }),
}));

function buildIndicator() {
  const configService = { get: () => 'redis://localhost:6379' } as unknown as ConfigService<
    Env,
    true
  >;
  return new RedisHealthIndicator(new HealthIndicatorService(), configService);
}

describe('RedisHealthIndicator', () => {
  beforeEach(() => {
    connect.mockReset().mockResolvedValue(undefined);
    ping.mockReset().mockResolvedValue('PONG');
    disconnect.mockReset();
  });

  it('reports up when PING succeeds, and always disconnects', async () => {
    const result = await buildIndicator().isHealthy('redis');
    expect(result).toEqual({ redis: expect.objectContaining({ status: 'up' }) });
    expect(ping).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('reports down when the connection fails, without throwing', async () => {
    connect.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const result = await buildIndicator().isHealthy('redis');
    expect(result).toEqual({ redis: expect.objectContaining({ status: 'down' }) });
  });

  it('reports down when PING fails, and still disconnects', async () => {
    ping.mockRejectedValue(new Error('READONLY'));
    const result = await buildIndicator().isHealthy('redis');
    expect(result).toEqual({ redis: expect.objectContaining({ status: 'down' }) });
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
