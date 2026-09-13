import { describe, expect, it, vi } from 'vitest';
import type { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

describe('HealthController', () => {
  it('delegates to HealthCheckService with HealthService’s indicator functions', async () => {
    const indicators = [vi.fn(), vi.fn()];
    const healthService = { getIndicators: () => indicators } as unknown as HealthService;

    const checkResult = {
      status: 'ok' as const,
      details: { postgres: { status: 'up' as const } },
    };
    const check = vi.fn().mockResolvedValue(checkResult);
    const health = { check } as unknown as HealthCheckService;

    const controller = new HealthController(health, healthService);
    const result = await controller.check();

    expect(check).toHaveBeenCalledWith(indicators);
    // Not toBe: the controller runs the result through
    // ApiHealthCheckSchema.parse(), which returns a new object.
    expect(result).toEqual(checkResult);
  });
});
