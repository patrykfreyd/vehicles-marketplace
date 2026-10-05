/**
 * Real Redis + real Postgres + real Sharp, no mocks — same shape as
 * `diagnostics.processor.integration.test.ts`, proving plans/12-image-
 * upload-processing-pipeline.md §6's flow end-to-end: a job picks up a
 * `Media` row's original, writes three WebP variants via the real
 * `LocalStorageService`, and classifies it via the fixture-backed
 * `FakeVisionAiClient` (no `OPENAI_API_KEY` set in this environment).
 * Skips instead of failing when real infra isn't available — see
 * vitest.setup.ts.
 */
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import sharp from 'sharp';
import type { Env } from '@vehicles-marketplace/config';
import { db } from '@vehicles-marketplace/db';
import type { StorageService } from '@vehicles-marketplace/storage';
import { createId } from '@vehicles-marketplace/utils';
import { STORAGE_SERVICE } from '../../common/storage/storage.tokens';
import { WorkerModule } from '../../worker.module';
import { IMAGE_PROCESSING_QUEUE, type ImageProcessingJobData } from './image-processing.constants';

const JOB_TIMEOUT_MS = 20_000;
const canRunAgainstRealRedis = process.env.WORKER_TEST_HAS_REAL_INFRA === 'true';

describe.skipIf(!canRunAgainstRealRedis)('ImageProcessingProcessor', () => {
  let app: INestApplicationContext;
  let queue: Queue<ImageProcessingJobData>;
  let queueEvents: QueueEvents;
  let storage: StorageService;
  let uploadRoot: string;

  const sellerId = 'test-img-seller';
  const vehicleId = 'test-img-vehicle';
  const listingId = 'test-img-listing';

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
    storage = app.get<StorageService>(STORAGE_SERVICE);
    const config = app.get(ConfigService<Env, true>);
    uploadRoot = resolve(process.cwd(), config.get('UPLOAD_ROOT', { infer: true }));

    const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    queue = new Queue(IMAGE_PROCESSING_QUEUE, { connection });
    queueEvents = new QueueEvents(IMAGE_PROCESSING_QUEUE, { connection });
    await queueEvents.waitUntilReady();

    await db.user.create({
      data: { id: sellerId, email: `${sellerId}@example.com`, displayName: 'Seller' },
    });
    await db.vehicle.create({
      data: { id: vehicleId, ownerId: sellerId, registration: 'IMG001Z', mileageMiles: 10_000 },
    });
    await db.listing.create({
      data: { id: listingId, vehicleId, sellerId, pricePence: 1_000_000 },
    });
  }, JOB_TIMEOUT_MS);

  afterEach(async () => {
    await db.media.deleteMany({ where: { listingId } });
  });

  afterAll(async () => {
    await queueEvents.close();
    await queue.close();
    await db.listing.deleteMany({ where: { id: listingId } });
    await db.vehicle.deleteMany({ where: { id: vehicleId } });
    await db.user.deleteMany({ where: { id: sellerId } });
    await rm(resolve(uploadRoot, 'listings', listingId), { recursive: true, force: true });
    await app.close();
  });

  it(
    'resizes an uploaded original into three WebP variants and classifies it',
    async () => {
      const mediaId = createId('med');
      const originalBuffer = await sharp({
        create: { width: 200, height: 150, channels: 3, background: { r: 180, g: 90, b: 40 } },
      })
        .jpeg()
        .toBuffer();
      const originalPath = `listings/${listingId}/original/${mediaId}.jpg`;
      await storage.upload(originalBuffer, originalPath);
      await db.media.create({ data: { id: mediaId, listingId, originalPath } });

      const job = await queue.add('process', { mediaId }, { attempts: 1 });
      await job.waitUntilFinished(queueEvents, JOB_TIMEOUT_MS);

      const media = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
      expect(media.status).toBe('DONE');
      expect(media.largePath).toBe(`listings/${listingId}/large/${mediaId}.webp`);
      expect(media.mediumPath).toBe(`listings/${listingId}/medium/${mediaId}.webp`);
      expect(media.thumbnailPath).toBe(`listings/${listingId}/thumbnail/${mediaId}.webp`);
      expect(media.category).toBe('EXTERIOR');
      expect(media.categoryConfidence).toBe(0.95);
      expect(media.categorySource).toBe('AI_DETECTED');

      const thumbnailBytes = await storage.download(media.thumbnailPath!);
      const meta = await sharp(thumbnailBytes).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBeLessThanOrEqual(400);
    },
    JOB_TIMEOUT_MS,
  );

  it(
    'marks Media FAILED with an error message once retries are exhausted',
    async () => {
      const mediaId = createId('med');
      // Points nowhere — storage.download() rejects immediately, so the
      // processor's catch branch runs without needing a real failure mode.
      await db.media.create({
        data: {
          id: mediaId,
          listingId,
          originalPath: `listings/${listingId}/original/does-not-exist.jpg`,
        },
      });

      const job = await queue.add('process', { mediaId }, { attempts: 1 });
      await expect(job.waitUntilFinished(queueEvents, JOB_TIMEOUT_MS)).rejects.toThrow();

      const media = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
      expect(media.status).toBe('FAILED');
      expect(media.errorMessage).toBeTruthy();
    },
    JOB_TIMEOUT_MS,
  );
});
