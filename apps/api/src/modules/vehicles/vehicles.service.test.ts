/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one. Exercises
 * plans/11-vehicle-listing-data-model.md §10's Vehicle-side acceptance
 * criteria.
 */
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type { CurrentUser } from '@vehicles-marketplace/validation';
import { VehiclesService } from './vehicles.service';

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

describe.skipIf(!canRunAgainstRealDb)('VehiclesService', () => {
  const service = new VehiclesService();

  const ownerId = 'test-veh-owner';
  const otherUserId = 'test-veh-other';
  const adminId = 'test-veh-admin';
  const makeId = 'test-veh-bmw';
  const modelId = `${makeId}-m4`;
  const generationId = `${modelId}-g82`;
  const approvedDerivativeId = `${generationId}-approved`;
  const draftDerivativeId = `${generationId}-draft`;
  const equipmentId = 'test-veh-carbon-seats';

  let confirmedLookupId: string;
  let unconfirmedLookupId: string;
  let unapprovedLookupId: string;

  beforeEach(async () => {
    await db.user.createMany({
      data: [
        { id: ownerId, email: `${ownerId}@example.com`, displayName: 'Owner' },
        { id: otherUserId, email: `${otherUserId}@example.com`, displayName: 'Other' },
        { id: adminId, email: `${adminId}@example.com`, displayName: 'Admin', isAdmin: true },
      ],
    });
    await db.make.create({ data: { id: makeId, name: 'Test Vehicles BMW' } });
    await db.model.create({ data: { id: modelId, makeId, name: 'M4' } });
    await db.generation.create({
      data: { id: generationId, modelId, code: 'G82', productionStartYear: 2021 },
    });
    await db.derivative.create({
      data: {
        id: approvedDerivativeId,
        generationId,
        name: 'M4 Competition xDrive',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'AWD',
        status: 'APPROVED',
      },
    });
    await db.derivative.create({
      data: {
        id: draftDerivativeId,
        generationId,
        name: 'M4 (draft)',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        status: 'AI_DRAFT',
      },
    });
    await db.equipment.create({
      data: { id: equipmentId, name: 'Carbon Bucket Seats', category: 'interior' },
    });

    confirmedLookupId = createId('vlk');
    await db.vehicleLookup.create({
      data: {
        id: confirmedLookupId,
        registration: 'YA22XYZ',
        requestedByUserId: ownerId,
        selectedDerivativeId: approvedDerivativeId,
        matchedManually: true,
        dvlaTaxStatus: 'Taxed',
        dvlaMotStatus: 'Valid',
      },
    });

    unconfirmedLookupId = createId('vlk');
    await db.vehicleLookup.create({
      data: { id: unconfirmedLookupId, registration: 'UC00NFD', requestedByUserId: ownerId },
    });

    unapprovedLookupId = createId('vlk');
    await db.vehicleLookup.create({
      data: {
        id: unapprovedLookupId,
        registration: 'UA00PPD',
        requestedByUserId: ownerId,
        selectedDerivativeId: draftDerivativeId,
        matchedManually: true,
      },
    });
  });

  afterEach(async () => {
    await db.vehicleModification.deleteMany({ where: { vehicle: { ownerId } } });
    await db.vehicleEquipment.deleteMany({ where: { vehicle: { ownerId } } });
    await db.vehicle.deleteMany({ where: { ownerId } });
    await db.vehicleLookup.deleteMany({ where: { requestedByUserId: ownerId } });
    await db.equipment.deleteMany({ where: { id: equipmentId } });
    await db.derivative.deleteMany({ where: { generationId } });
    await db.generation.deleteMany({ where: { modelId } });
    await db.model.deleteMany({ where: { id: modelId } });
    await db.make.deleteMany({ where: { id: makeId } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherUserId, adminId] } } });
  });

  it('creates a Vehicle from a confirmed lookup referencing an APPROVED derivative', async () => {
    const vehicle = await service.create(user(ownerId), {
      vehicleLookupId: confirmedLookupId,
      mileageMiles: 12_000,
      ukSupplied: true,
      imported: false,
      accidentDeclared: false,
    });

    expect(vehicle.ownerId).toBe(ownerId);
    expect(vehicle.derivativeId).toBe(approvedDerivativeId);
    expect(vehicle.registration).toBe('YA22XYZ');
    expect(vehicle.dvlaTaxStatus).toBe('Taxed');
    expect(vehicle.equipment).toEqual([]);
    expect(vehicle.modifications).toEqual([]);
  });

  it('rejects creation when the lookup has no confirmed (selected) derivative', async () => {
    await expect(
      service.create(user(ownerId), {
        vehicleLookupId: unconfirmedLookupId,
        mileageMiles: 1000,
        ukSupplied: true,
        imported: false,
        accidentDeclared: false,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects creation when the selected derivative is not APPROVED', async () => {
    await expect(
      service.create(user(ownerId), {
        vehicleLookupId: unapprovedLookupId,
        mileageMiles: 1000,
        ukSupplied: true,
        imported: false,
        accidentDeclared: false,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("never lets a different user create a vehicle from someone else's lookup", async () => {
    await expect(
      service.create(user(otherUserId), {
        vehicleLookupId: confirmedLookupId,
        mileageMiles: 1000,
        ukSupplied: true,
        imported: false,
        accidentDeclared: false,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects creating a second vehicle from the same lookup', async () => {
    await service.create(user(ownerId), {
      vehicleLookupId: confirmedLookupId,
      mileageMiles: 1000,
      ukSupplied: true,
      imported: false,
      accidentDeclared: false,
    });
    await expect(
      service.create(user(ownerId), {
        vehicleLookupId: confirmedLookupId,
        mileageMiles: 1000,
        ukSupplied: true,
        imported: false,
        accidentDeclared: false,
      }),
    ).rejects.toThrow(ConflictException);
  });

  describe('mutations on an existing vehicle', () => {
    async function createVehicle() {
      return service.create(user(ownerId), {
        vehicleLookupId: confirmedLookupId,
        mileageMiles: 12_000,
        ukSupplied: true,
        imported: false,
        accidentDeclared: false,
      });
    }

    it('lets the owner update seller-supplied fields', async () => {
      const vehicle = await createVehicle();
      const updated = await service.update(user(ownerId), vehicle.id, { mileageMiles: 15_000 });
      expect(updated.mileageMiles).toBe(15_000);
    });

    it('lets an admin update a vehicle they do not own', async () => {
      const vehicle = await createVehicle();
      const updated = await service.update(user(adminId, { isAdmin: true }), vehicle.id, {
        mileageMiles: 20_000,
      });
      expect(updated.mileageMiles).toBe(20_000);
    });

    it('forbids a non-owner, non-admin from updating the vehicle', async () => {
      const vehicle = await createVehicle();
      await expect(
        service.update(user(otherUserId), vehicle.id, { mileageMiles: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404s updating a vehicle that does not exist', async () => {
      await expect(
        service.update(user(ownerId), 'nonexistent-vehicle-id', { mileageMiles: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('adds and removes equipment, rejecting a duplicate add', async () => {
      const vehicle = await createVehicle();
      const added = await service.addEquipment(user(ownerId), vehicle.id, {
        equipmentId,
        source: 'SELLER_DECLARED',
      });
      expect(added.equipmentId).toBe(equipmentId);

      await expect(
        service.addEquipment(user(ownerId), vehicle.id, { equipmentId, source: 'SELLER_DECLARED' }),
      ).rejects.toThrow(ConflictException);

      await service.removeEquipment(user(ownerId), vehicle.id, added.id);
      const remaining = await db.vehicleEquipment.findMany({ where: { vehicleId: vehicle.id } });
      expect(remaining).toHaveLength(0);
    });

    it('adds and removes a modification', async () => {
      const vehicle = await createVehicle();
      const added = await service.addModification(user(ownerId), vehicle.id, {
        category: 'EXHAUST',
        brand: 'Akrapovic',
      });
      expect(added.category).toBe('EXHAUST');

      await service.removeModification(user(ownerId), vehicle.id, added.id);
      const remaining = await db.vehicleModification.findMany({ where: { vehicleId: vehicle.id } });
      expect(remaining).toHaveLength(0);
    });
  });
});
