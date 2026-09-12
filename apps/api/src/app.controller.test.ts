import { describe, expect, it } from 'vitest';
import { HealthCheckSchema } from '@vehicles-marketplace/validation';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('GET /health returns a payload that validates against HealthCheckSchema', () => {
    const controller = new AppController();
    const payload = controller.getHealth();
    expect(() => HealthCheckSchema.parse(payload)).not.toThrow();
    expect(payload.status).toBe('ok');
  });
});
