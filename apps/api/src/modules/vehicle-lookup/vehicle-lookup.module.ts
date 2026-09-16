/**
 * plans/10-dvla-lookup-seller-matching.md §3/§8 — the `DvlaClient` DI
 * provider: the real HTTP client whenever `DVLA_API_KEY` is set, the
 * fixture-backed fake otherwise (same config-presence pattern as
 * `EmailService`/`AiClient`, not a hard `APP_ENV` branch — see
 * `packages/config`'s own comment on why: Production doesn't have a real
 * DVLA key yet either, and silently booting Production against fixture
 * data would be worse than this). The actual selection logic lives in
 * `dvla/dvla-client.factory.ts`, unit-tested there directly.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@vehicles-marketplace/config';
import { buildDvlaClient } from './dvla/dvla-client.factory';
import { DVLA_CLIENT } from './dvla/dvla-client.tokens';
import { DvlaLookupThrottleGuard } from './dvla-lookup-throttle.guard';
import { VehicleLookupController } from './vehicle-lookup.controller';
import { VehicleLookupService } from './vehicle-lookup.service';

@Module({
  controllers: [VehicleLookupController],
  providers: [
    VehicleLookupService,
    DvlaLookupThrottleGuard,
    {
      provide: DVLA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildDvlaClient({
          apiKey: config.get('DVLA_API_KEY', { infer: true }),
          baseUrl: config.get('DVLA_API_BASE_URL', { infer: true }),
        }),
    },
  ],
})
export class VehicleLookupModule {}
