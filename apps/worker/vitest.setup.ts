/**
 * Runs before any test file — and therefore before `worker.module.ts` — is
 * imported. A Nest `@Module()`'s decorator argument evaluates as soon as
 * the class is defined, so `WorkerModule`'s `ConfigModule.forRoot({
 * validate: loadEnv })` validates `process.env` *at import time*, not when
 * the app actually boots. That means a bare `import { WorkerModule } from
 * './worker.module'` throws immediately if DATABASE_URL/REDIS_URL are
 * unset — before a test's own `describe.skipIf` ever gets a chance to skip
 * anything.
 *
 * This records whether real values were actually provided (the signal
 * worker.module.test.ts / diagnostics.processor.integration.test.ts use to
 * decide whether to run for real or skip), then fills in schema-valid
 * placeholders so importing WorkerModule never throws either way.
 */
process.env.WORKER_TEST_HAS_REAL_INFRA = String(
  Boolean(process.env.DATABASE_URL && process.env.REDIS_URL),
);

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/marketplace';
process.env.REDIS_URL ??= 'redis://localhost:6379';
// Plan 07 added AUTH_SECRET as a required (no-default) field — the worker
// process never actually uses it (only apps/api does), but WorkerModule
// shares packages/config's EnvSchema wholesale, so it still needs a
// schema-valid placeholder here for the same reason as DATABASE_URL/
// REDIS_URL above.
process.env.AUTH_SECRET ??= 'a'.repeat(32);
