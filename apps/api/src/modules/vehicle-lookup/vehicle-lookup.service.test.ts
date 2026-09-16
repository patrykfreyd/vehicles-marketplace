/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one. Exercises
 * plans/10-dvla-lookup-seller-matching.md §8's own worked example: a fixture
 * DVLA result matching Plan 08/09's BMW M4 fixture should rank the G82
 * Competition xDrive above the F82 derivative.
 */
import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import {
  FakeDvlaClient,
  FIXTURE_FOUND_REGISTRATION,
  FIXTURE_NOT_FOUND_REGISTRATION,
  FIXTURE_UNMATCHED_MAKE_REGISTRATION,
  FIXTURE_UNMATCHED_MAKE_TEXT,
} from './dvla/dvla-client.fake';
import { VehicleLookupService } from './vehicle-lookup.service';

const canRunAgainstRealDb = process.env.API_TEST_HAS_REAL_DB === 'true';

describe.skipIf(!canRunAgainstRealDb)('VehicleLookupService', () => {
  const service = new VehicleLookupService(new FakeDvlaClient());

  const userId = 'test-vl-user';
  const otherUserId = 'test-vl-other-user';
  const makeId = 'test-vl-bmw';
  const modelId = `${makeId}-m4`;
  const f82Id = `${modelId}-f82`;
  const g82Id = `${modelId}-g82`;
  const f82DerivativeId = `${f82Id}-m4`;
  const g82DerivativeId = `${g82Id}-m4-competition-xdrive`;

  beforeEach(async () => {
    await db.user.create({
      data: { id: userId, email: `${userId}@example.com`, displayName: 'Test Seller' },
    });
    await db.user.create({
      data: { id: otherUserId, email: `${otherUserId}@example.com`, displayName: 'Other Seller' },
    });
    // Deliberately not named "BMW" — a real catalogue `bmw` Make row may
    // already exist in whatever Postgres this runs against (e.g. from
    // manually running Plan 09's `catalogue import` locally), and this
    // suite must stay deterministic either way. Matching-by-make-name
    // (`matchedMakeId`) is covered in isolation below instead, with its own
    // guaranteed-not-to-collide fixture.
    await db.make.create({ data: { id: makeId, name: 'Test VL BMW Motors' } });
    await db.model.create({ data: { id: modelId, makeId, name: 'M4' } });
    await db.generation.create({
      data: { id: f82Id, modelId, code: 'F82', productionStartYear: 2014, productionEndYear: 2020 },
    });
    await db.generation.create({
      data: { id: g82Id, modelId, code: 'G82', productionStartYear: 2021 },
    });
    await db.derivative.create({
      data: {
        id: f82DerivativeId,
        generationId: f82Id,
        name: 'M4',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        engineCapacityCc: 2979,
        drivetrain: 'RWD',
        status: 'APPROVED',
      },
    });
    await db.derivative.create({
      data: {
        id: g82DerivativeId,
        generationId: g82Id,
        name: 'M4 Competition xDrive',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        engineCapacityCc: 2993,
        drivetrain: 'AWD',
        status: 'APPROVED',
      },
    });
  });

  afterEach(async () => {
    await db.vehicleLookup.deleteMany({
      where: { requestedByUserId: { in: [userId, otherUserId] } },
    });
    await db.derivative.deleteMany({ where: { generationId: { in: [f82Id, g82Id] } } });
    await db.generation.deleteMany({ where: { modelId } });
    await db.model.deleteMany({ where: { id: modelId } });
    await db.make.deleteMany({ where: { id: makeId } });
    await db.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  it('creates a VehicleLookup row and returns the DVLA fields, resolving the matched catalogue make', async () => {
    const result = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);

    expect(result.make).toBe('BMW');
    expect(result.fuel).toBe('PETROL');
    expect(result.engineCapacityCc).toBe(2993);
    expect(result.yearOfManufacture).toBe(2022);

    const stored = await db.vehicleLookup.findUnique({ where: { id: result.id } });
    expect(stored?.requestedByUserId).toBe(userId);
    expect(stored?.registration).toBe(FIXTURE_FOUND_REGISTRATION);
    expect(stored?.dvlaRawResponse).toBeTruthy();
  });

  it('throws NotFoundException for the fixture "not found" registration, without creating a row', async () => {
    await expect(
      service.lookupByRegistration(userId, FIXTURE_NOT_FOUND_REGISTRATION),
    ).rejects.toThrow(NotFoundException);

    const rows = await db.vehicleLookup.findMany({ where: { requestedByUserId: userId } });
    expect(rows).toHaveLength(0);
  });

  it('lists catalogue Models under the resolved make for the autocomplete step', async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);
    const page = await service.listModelCandidates(userId, lookup.id, { makeId });
    expect(page.items.map((item) => item.id)).toContain(modelId);
  });

  it('ranks the G82 Competition xDrive above the F82 derivative for a matching DVLA result', async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);
    const page = await service.listDerivativeCandidates(userId, lookup.id, { modelId });

    expect(page.items[0]?.id).toBe(g82DerivativeId);
    expect(page.items[0]?.engineCapacityDiffCc).toBe(0);
    expect(page.items.map((item) => item.id)).not.toContain(f82DerivativeId);
  });

  it('confirm() stores predictionAccepted: true when the seller picks the top-ranked candidate', async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);
    await service.listDerivativeCandidates(userId, lookup.id, { modelId });

    const confirmed = await service.confirm(userId, lookup.id, {
      derivativeId: g82DerivativeId,
      matchedManually: false,
    });
    expect(confirmed.predictionAccepted).toBe(true);
    expect(confirmed.selectedDerivativeId).toBe(g82DerivativeId);
  });

  it('confirm() stores predictionAccepted: false for a different pick than the top candidate', async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);
    await service.listDerivativeCandidates(userId, lookup.id, { modelId });

    const confirmed = await service.confirm(userId, lookup.id, {
      derivativeId: f82DerivativeId,
      matchedManually: false,
    });
    expect(confirmed.predictionAccepted).toBe(false);
  });

  it('confirm() stores predictionAccepted: false for manual matching, even onto the top candidate', async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);
    await service.listDerivativeCandidates(userId, lookup.id, { modelId });

    const confirmed = await service.confirm(userId, lookup.id, {
      derivativeId: g82DerivativeId,
      matchedManually: true,
    });
    expect(confirmed.predictionAccepted).toBe(false);
    expect(confirmed.matchedManually).toBe(true);
  });

  it("never lets a different user read or confirm against someone else's lookup", async () => {
    const lookup = await service.lookupByRegistration(userId, FIXTURE_FOUND_REGISTRATION);

    await expect(service.listModelCandidates(otherUserId, lookup.id, { makeId })).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.listDerivativeCandidates(otherUserId, lookup.id, { modelId }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.confirm(otherUserId, lookup.id, {
        derivativeId: g82DerivativeId,
        matchedManually: false,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

// Isolated from the suite above: `matchedMakeId` resolution matches by
// catalogue `Make.name`, so it needs its own fixture make text
// (`FIXTURE_UNMATCHED_MAKE_TEXT`) that's guaranteed not to collide with
// whatever's already in a given Postgres's `makes` table (see the note
// above `id: makeId` in the suite above).
describe.skipIf(!canRunAgainstRealDb)('VehicleLookupService — matchedMakeId resolution', () => {
  const service = new VehicleLookupService(new FakeDvlaClient());
  const userId = 'test-vl-make-match-user';
  const makeId = 'test-vl-make-match';

  beforeEach(async () => {
    await db.user.create({
      data: { id: userId, email: `${userId}@example.com`, displayName: 'Test Seller' },
    });
  });

  afterEach(async () => {
    await db.vehicleLookup.deleteMany({ where: { requestedByUserId: userId } });
    await db.make.deleteMany({ where: { id: makeId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  it("resolves matchedMakeId to the catalogue Make whose name matches DVLA's make text", async () => {
    await db.make.create({ data: { id: makeId, name: FIXTURE_UNMATCHED_MAKE_TEXT } });
    const result = await service.lookupByRegistration(userId, FIXTURE_UNMATCHED_MAKE_REGISTRATION);
    expect(result.matchedMakeId).toBe(makeId);
  });

  it("returns null when no catalogue Make matches DVLA's make text", async () => {
    const result = await service.lookupByRegistration(userId, FIXTURE_UNMATCHED_MAKE_REGISTRATION);
    expect(result.matchedMakeId).toBeNull();
  });
});
