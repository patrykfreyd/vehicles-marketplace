import { describe, expect, it } from 'vitest';
import { ApiHealthCheckSchema } from './health';

describe('ApiHealthCheckSchema', () => {
  it('accepts a healthy Terminus-shaped result', () => {
    const result = ApiHealthCheckSchema.safeParse({
      status: 'ok',
      info: { postgres: { status: 'up' }, redis: { status: 'up' } },
      details: { postgres: { status: 'up' }, redis: { status: 'up' } },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a failing result with a diagnostic message on the down indicator', () => {
    const result = ApiHealthCheckSchema.safeParse({
      status: 'error',
      error: { redis: { status: 'down', message: 'connect ECONNREFUSED' } },
      details: {
        postgres: { status: 'up' },
        redis: { status: 'down', message: 'connect ECONNREFUSED' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing details field', () => {
    const result = ApiHealthCheckSchema.safeParse({ status: 'ok' });
    expect(result.success).toBe(false);
  });

  it('rejects an indicator entry with no status', () => {
    const result = ApiHealthCheckSchema.safeParse({
      status: 'ok',
      details: { postgres: {} },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown top-level status', () => {
    const result = ApiHealthCheckSchema.safeParse({
      status: 'unknown',
      details: {},
    });
    expect(result.success).toBe(false);
  });
});
