import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { createAuthInstance } from './auth-instance';
import type { EmailService } from './email/email.service';

function buildEnv() {
  return {
    AUTH_SECRET: 'a'.repeat(32),
    APP_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3001',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  };
}

function buildFakeRedis(): Redis {
  return { incr: vi.fn(), expire: vi.fn() } as unknown as Redis;
}

describe('createAuthInstance', () => {
  it('builds a Better Auth instance exposing a handler and api surface', () => {
    const db = {} as unknown as PrismaClient;
    const emailService = {} as unknown as EmailService;

    const auth = createAuthInstance(buildEnv(), db, emailService, buildFakeRedis());

    expect(typeof auth.handler).toBe('function');
    expect(typeof auth.api.getSession).toBe('function');
    expect(typeof auth.api.signInEmail).toBe('function');
  });

  it('does not register the google provider when credentials are blank (§11.3 prep-only)', () => {
    const auth = createAuthInstance(
      buildEnv(),
      {} as unknown as PrismaClient,
      {} as unknown as EmailService,
      buildFakeRedis(),
    );
    expect(auth.options.socialProviders).toBeUndefined();
  });

  it('registers the google provider once both credentials are set', () => {
    const auth = createAuthInstance(
      { ...buildEnv(), GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' },
      {} as unknown as PrismaClient,
      {} as unknown as EmailService,
      buildFakeRedis(),
    );
    expect(auth.options.socialProviders?.google).toBeDefined();
  });
});
