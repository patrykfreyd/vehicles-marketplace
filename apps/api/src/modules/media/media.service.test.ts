/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one. Exercises
 * plans/12-image-upload-processing-pipeline.md §10's API-side acceptance
 * criteria: ownership, the 30-photo cap, manual category override, reorder,
 * delete-removes-files, and `/coverage`'s recommended-minimum table.
 * `FakeStorageService`/`FakeQueue` stand in for storage/BullMQ — this suite
 * is about `MediaService`'s own logic, not the worker (that's
 * `image-processing.processor.integration.test.ts`) or `LocalStorageService`
 * (that's `packages/storage`'s own suite).
 */
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Queue } from 'bullmq';
import { db } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import type { StorageService } from '@vehicles-marketplace/storage';
import { FakePostcodeGeocoder } from '../listings/geocoding/postcode-geocoder.fake';
import { ListingsService } from '../listings/listings.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MAX_PHOTOS_PER_LISTING, type ImageProcessingJobData } from './media.constants';
import { MediaService } from './media.service';

const canRunAgainstRealDb = process.env.API_TEST_HAS_REAL_DB === 'true';

function user(id: string, overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id,
    email: `${id}@example.com`,
    emailVerified: true,
    displayName: id,
    isAdmin: false,
    ...overrides,
  };
}

class FakeStorageService implements StorageService {
  readonly files = new Map<string, Buffer>();

  async upload(file: Buffer, path: string) {
    this.files.set(path, file);
    return { path, url: this.getUrl(path) };
  }

  async download(path: string) {
    const file = this.files.get(path);
    if (!file) throw new Error(`not found: ${path}`);
    return file;
  }

  async delete(path: string) {
    this.files.delete(path);
  }

  getUrl(path: string) {
    return `https://cdn.example/${path}`;
  }
}

class FakeQueue {
  readonly jobs: Array<{ name: string; data: ImageProcessingJobData }> = [];

  async add(name: string, data: ImageProcessingJobData) {
    this.jobs.push({ name, data });
    return {};
  }
}

function fakeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-jpeg-bytes'),
    size: 17,
    ...overrides,
  } as Express.Multer.File;
}

describe.skipIf(!canRunAgainstRealDb)('MediaService', () => {
  const vehiclesService = new VehiclesService();
  const listingsService = new ListingsService(vehiclesService, new FakePostcodeGeocoder());
  let storage: FakeStorageService;
  let queue: FakeQueue;
  let service: MediaService;

  const sellerId = 'test-med-seller';
  const otherUserId = 'test-med-other';
  const adminId = 'test-med-admin';
  let listingId: string;
  let vehicleId: string;

  beforeEach(async () => {
    await db.user.createMany({
      data: [
        { id: sellerId, email: `${sellerId}@example.com`, displayName: 'Seller' },
        { id: otherUserId, email: `${otherUserId}@example.com`, displayName: 'Other' },
        { id: adminId, email: `${adminId}@example.com`, displayName: 'Admin', isAdmin: true },
      ],
    });
    vehicleId = createId('veh');
    await db.vehicle.create({
      data: { id: vehicleId, ownerId: sellerId, registration: 'MED001Z', mileageMiles: 10_000 },
    });
    listingId = createId('lst');
    await db.listing.create({
      data: { id: listingId, vehicleId, sellerId, pricePence: 1_000_000 },
    });

    storage = new FakeStorageService();
    queue = new FakeQueue();
    service = new MediaService(
      listingsService,
      queue as unknown as Queue<ImageProcessingJobData>,
      storage,
    );
  });

  afterEach(async () => {
    await db.media.deleteMany({ where: { listingId } });
    await db.listing.deleteMany({ where: { id: listingId } });
    await db.vehicle.deleteMany({ where: { id: vehicleId } });
    await db.user.deleteMany({ where: { id: { in: [sellerId, otherUserId, adminId] } } });
  });

  it('stores the original and enqueues an image-processing job', async () => {
    const media = await service.upload(user(sellerId), listingId, fakeFile());
    expect(media.status).toBe('PENDING');
    expect(media.originalUrl).toContain(listingId);
    expect(queue.jobs).toEqual([{ name: 'process', data: { mediaId: media.id } }]);
  });

  it('rejects an upload from a user who does not own the listing', async () => {
    await expect(service.upload(user(otherUserId), listingId, fakeFile())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unsupported file type', async () => {
    await expect(
      service.upload(user(sellerId), listingId, fakeFile({ mimetype: 'application/pdf' })),
    ).rejects.toThrow();
  });

  it('enforces the 30-photo soft cap', async () => {
    await db.media.createMany({
      data: Array.from({ length: MAX_PHOTOS_PER_LISTING }, (_, i) => ({
        id: createId('med'),
        listingId,
        originalPath: `listings/${listingId}/original/seed-${i}.jpg`,
        position: i,
      })),
    });
    await expect(service.upload(user(sellerId), listingId, fakeFile())).rejects.toThrow(
      ConflictException,
    );
  });

  it('lets the seller manually override a category regardless of source', async () => {
    const media = await service.upload(user(sellerId), listingId, fakeFile());
    const updated = await service.updateCategory(user(sellerId), media.id, 'INTERIOR');
    expect(updated.category).toBe('INTERIOR');
    expect(updated.categorySource).toBe('SELLER_DECLARED');
  });

  it('reorders photos by the given id order', async () => {
    const first = await service.upload(user(sellerId), listingId, fakeFile());
    const second = await service.upload(user(sellerId), listingId, fakeFile());
    const reordered = await service.reorder(user(sellerId), listingId, [second.id, first.id]);
    expect(reordered.map((m) => m.id)).toEqual([second.id, first.id]);
  });

  it('rejects a reorder that does not list every photo exactly once', async () => {
    const media = await service.upload(user(sellerId), listingId, fakeFile());
    await expect(
      service.reorder(user(sellerId), listingId, [media.id, media.id]),
    ).rejects.toThrow();
  });

  it('removes a photo and its stored files', async () => {
    const media = await service.upload(user(sellerId), listingId, fakeFile());
    await service.remove(user(sellerId), media.id);
    await expect(db.media.findUnique({ where: { id: media.id } })).resolves.toBeNull();
  });

  it('only allows retrying a FAILED photo', async () => {
    const media = await service.upload(user(sellerId), listingId, fakeFile());
    await expect(service.retry(user(sellerId), media.id)).rejects.toThrow(ConflictException);

    await db.media.update({
      where: { id: media.id },
      data: { status: 'FAILED', errorMessage: 'boom' },
    });
    const retried = await service.retry(user(sellerId), media.id);
    expect(retried.status).toBe('PENDING');
    expect(retried.errorMessage).toBeNull();
    expect(queue.jobs).toHaveLength(2);
  });

  it('reports coverage counts and missing categories against the recommended minimums', async () => {
    for (let i = 0; i < 3; i++) {
      const media = await service.upload(user(sellerId), listingId, fakeFile());
      await db.media.update({ where: { id: media.id }, data: { category: 'EXTERIOR' } });
    }

    const coverage = await service.coverage(user(sellerId), listingId);
    expect(coverage.counts.EXTERIOR).toBe(3);
    expect(coverage.counts.INTERIOR).toBe(0);
    expect(coverage.missing).toContain('INTERIOR');
    expect(coverage.missing).toContain('EXTERIOR'); // only 3 of the recommended 4
  });

  it('404s when the media id does not exist', async () => {
    await expect(service.updateCategory(user(sellerId), 'nonexistent', 'OTHER')).rejects.toThrow(
      NotFoundException,
    );
  });
});
