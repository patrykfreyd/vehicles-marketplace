import { describe, expect, it } from 'vitest';
import type { HealthStatus, Id } from './index';

describe('types', () => {
  it('allows a HealthStatus value to be assigned', () => {
    const status: HealthStatus = 'ok';
    expect(status).toBe('ok');
  });

  it('treats a branded Id as a plain string at runtime', () => {
    const userId = 'user_1' as Id<'User'>;
    expect(typeof userId).toBe('string');
  });
});
