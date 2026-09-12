import { describe, expect, it } from 'vitest';
import { HealthCheckSchema, createHealthCheck } from './index';

describe('HealthCheckSchema', () => {
  it('creates a payload that validates against its own schema', () => {
    const payload = createHealthCheck();
    expect(() => HealthCheckSchema.parse(payload)).not.toThrow();
    expect(payload.status).toBe('ok');
  });

  it('rejects a payload with an invalid status', () => {
    expect(() =>
      HealthCheckSchema.parse({ status: 'nope', timestamp: new Date().toISOString() }),
    ).toThrow();
  });
});
