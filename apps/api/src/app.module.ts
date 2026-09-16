import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { loadEnv, type Env } from '@vehicles-marketplace/config';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { DbModule } from './common/db/db.module';
import { buildPinoHttpParams } from './common/logging/pino-options';
import { NotFoundFallbackModule } from './common/not-found/not-found.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthGuard } from './modules/auth/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { EmailVerificationDeadlineGuard } from './modules/auth/email-verification-deadline.guard';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { CatalogueAdminModule } from './modules/catalogue-admin/catalogue-admin.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
import { VehicleLookupModule } from './modules/vehicle-lookup/vehicle-lookup.module';

// This is the module template every future module-owning plan copies (see
// plans/05-backend-api-foundation.md §5) — `HealthModule` below is the one
// throwaway example built here to prove the pipeline end-to-end; every
// other business module (Auth, Catalogue, Vehicles, ...) ships with its
// own owning plan and just imports into this array.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fails fast on an invalid/missing env var at boot, instead of a
      // confusing failure the first time some later code reads it.
      validate: loadEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildPinoHttpParams({ APP_ENV: config.get('APP_ENV', { infer: true }) }),
    }),
    // Conservative global default (100 req/min/IP); endpoints that need a
    // tighter limit (login, message send, ...) override it per-route in
    // the plan that owns them — see §3's rate-limiting decision.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DbModule,
    RedisModule,
    AuthModule,
    CatalogueModule,
    CatalogueAdminModule,
    HealthModule,
    ListingsModule,
    VehicleLookupModule,
    // Wildcard fallback — must stay last so every real module's routes are
    // matched first (see NotFoundFallbackController for why it exists).
    NotFoundFallbackModule,
  ],
  providers: [
    // Every request body/query/param is validated against its Zod DTO
    // before the handler runs; a failure becomes a ZodValidationException,
    // caught by ApiExceptionFilter below.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // The one place every response is shaped into ApiErrorSchema on
    // failure — see plans/05-backend-api-foundation.md §4.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Validates/strips a handler's return value against its @ZodResponse
    // DTO, when one is declared (inert otherwise) — the response-side half
    // of the validation pipeline.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // plans/07-authentication-authorization.md §5 — every route requires a
    // valid session by default; `@Public()` opts a route out explicitly.
    // Registered after ThrottlerGuard and before EmailVerificationDeadline-
    // Guard, since Nest runs multiple APP_GUARD entries in declaration
    // order and the deadline check needs `req.user`, which this guard sets.
    { provide: APP_GUARD, useClass: AuthGuard },
    // §11.2 — locks out an unverified account 7 days after registration,
    // account-wide (not just listing/messaging — that's EmailVerifiedGuard,
    // applied per-route instead).
    { provide: APP_GUARD, useClass: EmailVerificationDeadlineGuard },
  ],
})
export class AppModule {}
