import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@vehicles-marketplace/config';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { HttpPostcodeGeocoder } from './geocoding/postcode-geocoder.http';
import { POSTCODE_GEOCODER } from './geocoding/postcode-geocoder.tokens';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [VehiclesModule],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    // postcodes.io needs no API key (plans/13-search-filtering.md §3/§10.1)
    // — unlike `DVLA_CLIENT`, there's no fake-vs-real selection to make
    // here; every environment wires the real HTTP client. Tests that need
    // a deterministic result construct `ListingsService` directly with a
    // `FakePostcodeGeocoder` instead (same pattern as `VehicleLookupService`
    // tests do for `DvlaClient`).
    {
      provide: POSTCODE_GEOCODER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new HttpPostcodeGeocoder({
          baseUrl: config.get('POSTCODES_IO_BASE_URL', { infer: true }),
        }),
    },
  ],
  exports: [ListingsService],
})
export class ListingsModule {}
