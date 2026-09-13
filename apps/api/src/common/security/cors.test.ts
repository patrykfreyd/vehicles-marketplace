import { describe, expect, it } from 'vitest';
import { buildCorsOrigins } from './cors';

describe('buildCorsOrigins', () => {
  it('allows the configured web app URL and the mobile app scheme', () => {
    const origins = buildCorsOrigins({ APP_URL: 'https://app.example.co.uk' });
    expect(origins).toContain('https://app.example.co.uk');
    expect(origins).toContain('vehiclesmarketplace://');
  });
});
