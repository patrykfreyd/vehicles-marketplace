/**
 * plans/07-authentication-authorization.md §5 — instantiates the Better
 * Auth server and exports everything every other module needs: the guards
 * (`AuthGuard` is wired as a global `APP_GUARD` in app.module.ts, the rest
 * used per-route via `@UseGuards(...)`), and the decorators.
 *
 * `@Global()`, same reasoning as `DbModule`/`RedisModule`: essentially
 * every future module (08–34) applies `AdminGuard`/`EmailVerifiedGuard` to
 * at least one route, and forcing each to import `AuthModule` just to
 * `@UseGuards(AdminGuard)` would be pure ceremony — see
 * apps/api/src/modules/listings/listings.controller.ts for the first real
 * consumer.
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Env } from '@vehicles-marketplace/config';
import { DB } from '../../common/db/db.module';
import { REDIS } from '../../common/redis/redis.module';
import { AdminGuard } from './admin.guard';
import { createAuthInstance } from './auth-instance';
import { AuthGuard } from './auth.guard';
import { AUTH } from './auth.tokens';
import { EmailService } from './email/email.service';
import { EmailVerificationDeadlineGuard } from './email-verification-deadline.guard';
import { EmailVerifiedGuard } from './email-verified.guard';

@Global()
@Module({
  providers: [
    EmailService,
    {
      provide: AUTH,
      inject: [ConfigService, DB, EmailService, REDIS],
      useFactory: (
        config: ConfigService<Env, true>,
        db: PrismaClient,
        emailService: EmailService,
        redis: Redis,
      ) =>
        createAuthInstance(
          {
            AUTH_SECRET: config.get('AUTH_SECRET', { infer: true }),
            APP_URL: config.get('APP_URL', { infer: true }),
            API_URL: config.get('API_URL', { infer: true }),
            GOOGLE_CLIENT_ID: config.get('GOOGLE_CLIENT_ID', { infer: true }),
            GOOGLE_CLIENT_SECRET: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
          },
          db,
          emailService,
          redis,
        ),
    },
    AuthGuard,
    AdminGuard,
    EmailVerifiedGuard,
    EmailVerificationDeadlineGuard,
  ],
  exports: [AUTH, AuthGuard, AdminGuard, EmailVerifiedGuard, EmailVerificationDeadlineGuard],
})
export class AuthModule {}
