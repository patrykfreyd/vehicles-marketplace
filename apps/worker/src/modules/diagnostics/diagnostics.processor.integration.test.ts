import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { WorkerModule } from '../../worker.module';
import { DIAGNOSTICS_QUEUE } from './diagnostics.constants';
import type { DiagnosticsJobData, DiagnosticsJobResult } from './diagnostics.processor';

const JOB_TIMEOUT_MS = 10_000;

// Plan 05's acceptance criterion: "apps/worker boots via
// createApplicationContext ... and successfully processes one test BullMQ
// job end-to-end against local Redis." This is that proof — real Redis,
// real BullMQ Queue/Worker, no mocks. See worker.module.test.ts and
// vitest.setup.ts for why this gates on WORKER_TEST_HAS_REAL_INFRA rather
// than REDIS_URL directly; CI sets real values against its postgres/redis
// services (.github/workflows/ci.yml). Skips instead of failing when
// they're absent, so `pnpm test` stays green without Docker running locally.
const canRunAgainstRealRedis = process.env.WORKER_TEST_HAS_REAL_INFRA === 'true';

describe.skipIf(!canRunAgainstRealRedis)('DiagnosticsProcessor', () => {
  let app: INestApplicationContext;
  let queue: Queue<DiagnosticsJobData>;
  let queueEvents: QueueEvents;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });

    const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    queue = new Queue(DIAGNOSTICS_QUEUE, { connection });
    queueEvents = new QueueEvents(DIAGNOSTICS_QUEUE, { connection });
    await queueEvents.waitUntilReady();
  }, JOB_TIMEOUT_MS);

  afterAll(async () => {
    await queueEvents.close();
    await queue.close();
    await app.close();
  });

  it(
    'processes a job added to the queue and returns the processor’s result',
    async () => {
      const nonce = randomUUID();
      const job = await queue.add('diagnose', { nonce });

      const result = (await job.waitUntilFinished(
        queueEvents,
        JOB_TIMEOUT_MS,
      )) as DiagnosticsJobResult;

      expect(result.nonce).toBe(nonce);
      expect(new Date(result.processedAt).toString()).not.toBe('Invalid Date');
    },
    JOB_TIMEOUT_MS,
  );
});
