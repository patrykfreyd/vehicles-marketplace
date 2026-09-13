/**
 * The queue-consuming process's module graph (§6): shares
 * `packages/config`'s env validation with `apps/api`, but imports only
 * modules that register BullMQ processors — never a controller-only
 * module. `DiagnosticsModule` is this plan's own throwaway proof that the
 * pipeline works end-to-end (§9); every real queue (image processing,
 * notifications, ...) is registered by its owning plan the same way.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { loadEnv, type Env } from '@vehicles-marketplace/config';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: loadEnv }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        // A shared ioredis connection, not a raw URL string — BullMQ's
        // `Worker` requires `maxRetriesPerRequest: null` on its connection
        // (it throws at startup otherwise), which only ioredis's own
        // options object exposes.
        connection: new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    DiagnosticsModule,
  ],
})
export class WorkerModule {}
