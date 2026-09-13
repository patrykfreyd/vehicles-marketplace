import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Env } from '@vehicles-marketplace/config';
import { PostgresHealthIndicator } from './postgres-health.indicator';

const { connect, query, end } = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
}));
// Hoisted above the imports above by Vitest, so PostgresHealthIndicator
// already sees the mocked `pg` by the time it's imported. A plain
// `function`, not an arrow function — the source calls `new Client(...)`,
// and only a function that can be a constructor (or one that explicitly
// returns an object, like this one) works with `new`.
vi.mock('pg', () => ({
  Client: vi.fn().mockImplementation(function FakeClient() {
    return { connect, query, end };
  }),
}));

function buildIndicator() {
  const configService = {
    get: () => 'postgresql://user:pass@localhost:5432/db',
  } as unknown as ConfigService<Env, true>;
  return new PostgresHealthIndicator(new HealthIndicatorService(), configService);
}

describe('PostgresHealthIndicator', () => {
  beforeEach(() => {
    connect.mockReset().mockResolvedValue(undefined);
    query.mockReset().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    end.mockReset().mockResolvedValue(undefined);
  });

  it('reports up when SELECT 1 succeeds, and always closes the connection', async () => {
    const result = await buildIndicator().isHealthy('postgres');
    expect(result).toEqual({ postgres: expect.objectContaining({ status: 'up' }) });
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(end).toHaveBeenCalledOnce();
  });

  it('reports down when the connection fails, without throwing', async () => {
    connect.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const result = await buildIndicator().isHealthy('postgres');
    expect(result).toEqual({ postgres: expect.objectContaining({ status: 'down' }) });
  });

  it('reports down when the query itself fails, and still closes the connection', async () => {
    query.mockRejectedValue(new Error('relation does not exist'));
    const result = await buildIndicator().isHealthy('postgres');
    expect(result).toEqual({ postgres: expect.objectContaining({ status: 'down' }) });
    expect(end).toHaveBeenCalledOnce();
  });
});
