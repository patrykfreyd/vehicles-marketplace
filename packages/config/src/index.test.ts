import { describe, expect, it } from 'vitest';
import { loadEnv } from './index';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/marketplace',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'a-very-secret-value',
};

describe('loadEnv', () => {
  it('applies every default when only the required fields are set', () => {
    expect(loadEnv(validEnv)).toEqual({
      NODE_ENV: 'development',
      APP_ENV: 'local',
      APP_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
      PORT: 3001,
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      SMTP_HOST: '',
      SMTP_PORT: 587,
      SMTP_USER: '',
      SMTP_PASSWORD: '',
      SMTP_SECURE: false,
      EMAIL_FROM: 'Vehicles Marketplace <no-reply@example.co.uk>',
      ...validEnv,
    });
  });

  it('requires AUTH_SECRET', () => {
    expect(() =>
      loadEnv({ DATABASE_URL: validEnv.DATABASE_URL, REDIS_URL: validEnv.REDIS_URL }),
    ).toThrow();
  });

  it('coerces SMTP_SECURE from the string "true"', () => {
    expect(loadEnv({ ...validEnv, SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
  });

  it('passes through valid overrides', () => {
    const env = loadEnv({
      ...validEnv,
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PORT: '8080',
    });
    expect(env.NODE_ENV).toBe('production');
    expect(env.APP_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => loadEnv({ ...validEnv, NODE_ENV: 'bogus' })).toThrow();
  });

  it('rejects an invalid APP_ENV', () => {
    expect(() => loadEnv({ ...validEnv, APP_ENV: 'staging' })).toThrow();
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadEnv({ REDIS_URL: validEnv.REDIS_URL })).toThrow();
  });

  it('requires REDIS_URL', () => {
    expect(() => loadEnv({ DATABASE_URL: validEnv.DATABASE_URL })).toThrow();
  });

  it('rejects a non-URL APP_URL', () => {
    expect(() => loadEnv({ ...validEnv, APP_URL: 'not-a-url' })).toThrow();
  });
});
