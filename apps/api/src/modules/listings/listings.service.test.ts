/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one. Exercises
 * plans/11-vehicle-listing-data-model.md §10's Listing-side acceptance
 * criteria: ownership on create, the §7 status-transition table, price
 * history on every price change, and §3's visibility/masking rules.
 */
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ListingsService } from './listings.service';

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

describe.skipIf(!canRunAgainstRealDb)('ListingsService', () => {
  const vehiclesService = new VehiclesService();
  const service = new ListingsService(vehiclesService);

  const sellerId = 'test-lst-seller';
  const otherUserId = 'test-lst-other';
  const adminId = 'test-lst-admin';
  const makeId = 'test-lst-bmw';
  const modelId = `${makeId}-m4`;
  const generationId = `${modelId}-g82`;
  const derivativeId = `${generationId}-approved`;

  let publishableVehicleId: string;
  let noDerivativeVehicleId: string;

  beforeEach(async () => {
    await db.user.createMany({
      data: [
        { id: sellerId, email: `${sellerId}@example.com`, displayName: 'Seller' },
        { id: otherUserId, email: `${otherUserId}@example.com`, displayName: 'Other' },
        { id: adminId, email: `${adminId}@example.com`, displayName: 'Admin', isAdmin: true },
      ],
    });
    await db.make.create({ data: { id: makeId, name: 'Test Listings BMW' } });
    await db.model.create({ data: { id: modelId, makeId, name: 'M4' } });
    await db.generation.create({
      data: { id: generationId, modelId, code: 'G82', productionStartYear: 2021 },
    });
    await db.derivative.create({
      data: {
        id: derivativeId,
        generationId,
        name: 'M4 Competition xDrive',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'AWD',
        status: 'APPROVED',
      },
    });

    publishableVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: publishableVehicleId,
        ownerId: sellerId,
        derivativeId,
        registration: 'YA22XYZ',
        mileageMiles: 12_000,
      },
    });

    noDerivativeVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: noDerivativeVehicleId,
        ownerId: sellerId,
        registration: 'ND00DRV',
        mileageMiles: 5000,
      },
    });
  });

  afterEach(async () => {
    await db.media.deleteMany({ where: { listing: { sellerId } } });
    await db.listingPriceHistory.deleteMany({ where: { listing: { sellerId } } });
    await db.listing.deleteMany({ where: { sellerId } });
    await db.vehicle.deleteMany({ where: { ownerId: sellerId } });
    await db.derivative.deleteMany({ where: { generationId } });
    await db.generation.deleteMany({ where: { modelId } });
    await db.model.deleteMany({ where: { id: modelId } });
    await db.make.deleteMany({ where: { id: makeId } });
    await db.user.deleteMany({ where: { id: { in: [sellerId, otherUserId, adminId] } } });
  });

  async function addPhoto(listingId: string) {
    await db.media.create({
      data: { id: createId('med'), listingId, path: `/fixtures/${listingId}.jpg` },
    });
  }

  it('creates a Listing against a vehicle the caller owns, with an initial price-history entry', async () => {
    const listing = await service.create(user(sellerId), {
      vehicleId: publishableVehicleId,
      pricePence: 2649500,
      locationCountry: 'GB',
    });

    expect(listing.sellerId).toBe(sellerId);
    expect(listing.status).toBe('DRAFT');
    expect(listing.priceHistory).toHaveLength(1);
    expect(listing.priceHistory[0]?.pricePence).toBe(2649500);
  });

  it('rejects creating a listing against a vehicle the caller does not own (403)', async () => {
    await expect(
      service.create(user(otherUserId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects creating a second listing against the same vehicle', async () => {
    await service.create(user(sellerId), {
      vehicleId: publishableVehicleId,
      pricePence: 2649500,
      locationCountry: 'GB',
    });
    await expect(
      service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 100,
        locationCountry: 'GB',
      }),
    ).rejects.toThrow(ConflictException);
  });

  describe('reading a listing', () => {
    it('404s for a DRAFT listing requested by a stranger (never 403 — no confirming existence)', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await expect(service.getById(user(otherUserId), listing.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("masks the registration for a stranger once LIVE, but shows the seller's own GET the full plate", async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await addPhoto(listing.id);
      await service.updateStatus(user(sellerId), listing.id, 'LIVE');

      const asStranger = await service.getById(user(otherUserId), listing.id);
      expect(asStranger.vehicle.registration).toBe('YA22 ***');

      const asSeller = await service.getById(user(sellerId), listing.id);
      expect(asSeller.vehicle.registration).toBe('YA22XYZ');
    });

    it('is visible to a stranger once LIVE', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await addPhoto(listing.id);
      await service.updateStatus(user(sellerId), listing.id, 'LIVE');

      const asStranger = await service.getById(user(otherUserId), listing.id);
      expect(asStranger.status).toBe('LIVE');
    });
  });

  describe('price changes', () => {
    it('inserts one ListingPriceHistory row per price change, reproducing a 3-entry sequence', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await service.update(user(sellerId), listing.id, { pricePence: 2599500 });
      const final = await service.update(user(sellerId), listing.id, { pricePence: 2549500 });

      expect(final.priceHistory).toHaveLength(3);
      expect(final.priceHistory.map((entry) => entry.pricePence)).toEqual([
        2649500, 2599500, 2549500,
      ]);
    });

    it('rejects a price change once the listing is SOLD', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await addPhoto(listing.id);
      await service.updateStatus(user(sellerId), listing.id, 'LIVE');
      await service.updateStatus(user(sellerId), listing.id, 'SOLD');

      await expect(service.update(user(sellerId), listing.id, { pricePence: 1 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('status transitions (§7)', () => {
    it('rejects DRAFT -> SOLD directly', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await expect(service.updateStatus(user(sellerId), listing.id, 'SOLD')).rejects.toThrow(
        ConflictException,
      );
    });

    it('walks the full valid lifecycle: DRAFT -> LIVE -> PAUSED -> LIVE -> RESERVED -> SOLD', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await addPhoto(listing.id);

      const live = await service.updateStatus(user(sellerId), listing.id, 'LIVE');
      expect(live.publishedAt).not.toBeNull();

      await service.updateStatus(user(sellerId), listing.id, 'PAUSED');
      await service.updateStatus(user(sellerId), listing.id, 'LIVE');
      const reserved = await service.updateStatus(user(sellerId), listing.id, 'RESERVED');
      expect(reserved.reservedAt).not.toBeNull();

      const sold = await service.updateStatus(user(sellerId), listing.id, 'SOLD');
      expect(sold.status).toBe('SOLD');
      expect(sold.soldAt).not.toBeNull();
    });

    it('rejects publishing (-> LIVE) when the vehicle has no confirmed derivative', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: noDerivativeVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await addPhoto(listing.id);
      await expect(service.updateStatus(user(sellerId), listing.id, 'LIVE')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects publishing (-> LIVE) with no photos', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await expect(service.updateStatus(user(sellerId), listing.id, 'LIVE')).rejects.toThrow(
        ConflictException,
      );
    });

    it('forbids a non-owner, non-admin from transitioning status', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      await expect(service.updateStatus(user(otherUserId), listing.id, 'ARCHIVED')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an admin transition a listing they do not own', async () => {
      const listing = await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      const archived = await service.updateStatus(
        user(adminId, { isAdmin: true }),
        listing.id,
        'ARCHIVED',
      );
      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('list()', () => {
    it("returns the seller's own listings for sellerId=me", async () => {
      await service.create(user(sellerId), {
        vehicleId: publishableVehicleId,
        pricePence: 2649500,
        locationCountry: 'GB',
      });
      const page = await service.list(user(sellerId), { sellerId: 'me', page: 1, pageSize: 20 });
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(1);
    });

    it("forbids querying another seller's listings without admin", async () => {
      await expect(
        service.list(user(otherUserId), { sellerId, page: 1, pageSize: 20 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
