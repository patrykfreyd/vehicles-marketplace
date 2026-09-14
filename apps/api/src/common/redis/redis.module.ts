/**
 * A shared, long-lived `ioredis` client, injectable anywhere in the Nest DI
 * graph under the `REDIS` token — same pattern as `common/db/db.module.ts`'s
 * `DB` token (§6 of plans/06-database-schema-migrations-baseline.md: one
 * long-lived client per process, not a short-lived one per use). First real
 * consumer is Plan 07's `AuthRateLimitHook` (IP+email-keyed sign-in/sign-up/
 * forgot-password throttling); the existing `RedisHealthIndicator` (Plan 05)
 * deliberately keeps its own short-lived connection per check, unrelated to
 * this — see that file's comment.
 */
import { Global, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '@vehicles-marketplace/config';

export const REDIS = Symbol('REDIS');

/**
 * A thin class wrapper around the raw `ioredis` client, for one reason
 * only: `OnModuleDestroy`. A bare `Redis` instance returned straight from a
 * `useFactory` has no Nest lifecycle hook, so its socket stays open forever
 * — including past `app.close()` — which keeps the Node process alive
 * indefinitely (discovered running `scripts/generate-openapi.ts`, a
 * short-lived script that boots `AppModule` then expects to exit). Nest
 * only wires up `onModuleDestroy` for provider instances that implement it,
 * which a plain object can't.
 */
@Injectable()
class RedisClientProvider implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }));
    // ioredis needs at least one 'error' listener or a connection failure
    // becomes an unhandled 'error' event that crashes the process;
    // ioredis's own retryStrategy already handles reconnects, so this
    // listener exists only to satisfy that requirement.
    this.client.on('error', () => {});
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}

@Global()
@Module({
  providers: [
    RedisClientProvider,
    {
      provide: REDIS,
      inject: [RedisClientProvider],
      useFactory: (provider: RedisClientProvider) => provider.client,
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
