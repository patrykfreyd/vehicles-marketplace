import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DbModule } from '../../common/db/db.module';
import { RedisModule } from '../../common/redis/redis.module';
import { AdminGuard } from './admin.guard';
import { AuthModule } from './auth.module';
import { AuthGuard } from './auth.guard';
import { AUTH } from './auth.tokens';
import { EmailVerificationDeadlineGuard } from './email-verification-deadline.guard';
import { EmailVerifiedGuard } from './email-verified.guard';

describe('AuthModule', () => {
  it('wires the Better Auth instance and every guard as injectable providers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              AUTH_SECRET: 'a'.repeat(32),
              APP_URL: 'http://localhost:3000',
              API_URL: 'http://localhost:3001',
              GOOGLE_CLIENT_ID: '',
              GOOGLE_CLIENT_SECRET: '',
              REDIS_URL: 'redis://localhost:6379',
              SMTP_HOST: '',
              SMTP_PORT: 587,
              SMTP_USER: '',
              SMTP_PASSWORD: '',
              SMTP_SECURE: false,
              EMAIL_FROM: 'Vehicles Marketplace <no-reply@example.co.uk>',
            }),
          ],
        }),
        LoggerModule.forRoot(),
        DbModule,
        RedisModule,
        AuthModule,
      ],
    }).compile();

    const auth = moduleRef.get(AUTH);
    expect(typeof (auth as { handler: unknown }).handler).toBe('function');
    expect(moduleRef.get(AuthGuard)).toBeInstanceOf(AuthGuard);
    expect(moduleRef.get(AdminGuard)).toBeInstanceOf(AdminGuard);
    expect(moduleRef.get(EmailVerifiedGuard)).toBeInstanceOf(EmailVerifiedGuard);
    expect(moduleRef.get(EmailVerificationDeadlineGuard)).toBeInstanceOf(
      EmailVerificationDeadlineGuard,
    );

    await moduleRef.close();
  });
});
