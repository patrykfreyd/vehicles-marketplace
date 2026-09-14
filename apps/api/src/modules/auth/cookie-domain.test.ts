import { describe, expect, it } from 'vitest';
import { cookieDomainForAppUrl } from './cookie-domain';

describe('cookieDomainForAppUrl', () => {
  it('returns undefined for localhost (Local dev)', () => {
    expect(cookieDomainForAppUrl('http://localhost:3000')).toBeUndefined();
  });

  it('returns undefined for 127.0.0.1', () => {
    expect(cookieDomainForAppUrl('http://127.0.0.1:3000')).toBeUndefined();
  });

  it('returns a leading-dot domain for a real hostname', () => {
    expect(cookieDomainForAppUrl('https://example.co.uk')).toBe('.example.co.uk');
  });

  it('returns undefined for an unparseable URL', () => {
    expect(cookieDomainForAppUrl('not-a-url')).toBeUndefined();
  });
});
