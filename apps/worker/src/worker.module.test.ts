import { describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

// WorkerModule validates the full shared Env schema (packages/config) and
// registers a BullMQ connection, so booting it for real needs both
// DATABASE_URL and REDIS_URL set and REDIS_URL reachable — CI sets both
// against its postgres/redis services (see .github/workflows/ci.yml).
// Left unset, this skips instead of failing so `pnpm test` stays green on a
// machine with no Docker services running locally. See vitest.setup.ts for
// why this reads WORKER_TEST_HAS_REAL_INFRA rather than REDIS_URL directly.
const canRunAgainstRealRedis = process.env.WORKER_TEST_HAS_REAL_INFRA === 'true';

describe.skipIf(!canRunAgainstRealRedis)('WorkerModule', () => {
  it('boots a standalone Nest application context against a real Redis', async () => {
    const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
    expect(app).toBeDefined();
    await app.close();
  });
});
