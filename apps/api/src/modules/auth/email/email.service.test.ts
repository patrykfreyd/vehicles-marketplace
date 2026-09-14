import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { Logger } from 'nestjs-pino';
import type { Env } from '@vehicles-marketplace/config';
import { EmailService } from './email.service';

// `vi.spyOn(nodemailer, 'createTransport')` doesn't work here — nodemailer
// is CJS and Vitest's ESM interop makes its module namespace read-only, so
// the whole module is mocked instead. `vi.mock` factories are hoisted above
// imports, so the mocks they reference must be too (`vi.hoisted`).
const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  return { sendMail, createTransport: vi.fn().mockReturnValue({ sendMail }) };
});
vi.mock('nodemailer', () => ({ createTransport }));

function buildConfig(overrides: Partial<Env> = {}): ConfigService<Env, true> {
  const env: Partial<Env> = {
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_SECURE: false,
    EMAIL_FROM: 'Vehicles Marketplace <no-reply@example.co.uk>',
    ...overrides,
  };
  return { get: (key: keyof Env) => env[key] } as unknown as ConfigService<Env, true>;
}

function buildLogger(): Logger {
  return { setContext: vi.fn(), log: vi.fn(), error: vi.fn() } as unknown as Logger;
}

describe('EmailService', () => {
  it('logs instead of sending when SMTP_HOST is unset (prep-only mode)', async () => {
    const logger = buildLogger();
    const service = new EmailService(buildConfig(), logger);

    await service.sendVerificationEmail('jane@example.com', 'https://example.co.uk/verify?token=x');

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [, message] = vi.mocked(logger.log).mock.calls[0]!;
    expect(String(message)).toContain('SMTP not configured');
  });

  it('sends via nodemailer once SMTP_HOST is configured', async () => {
    const service = new EmailService(
      buildConfig({ SMTP_HOST: 'smtp.example.com', SMTP_USER: 'u', SMTP_PASSWORD: 'p' }),
      buildLogger(),
    );

    await service.sendPasswordResetEmail('jane@example.com', 'https://example.co.uk/reset?token=x');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com' }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com', subject: 'Reset your password' }),
    );
  });
});
