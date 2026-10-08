/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one. Exercises
 * plans/13-search-filtering.md §9's acceptance criteria directly: free-text
 * alias matching, standard + advanced filters (individually and combined),
 * equipment AND-matching, distance sorting against real geocoded
 * coordinates, and the hard visibility rule (never a `DRAFT`/`SOLD`
 * listing, however permissive the filters).
 */
import { LocalStorageService } from '@vehicles-marketplace/storage';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type { SearchRequest } from '@vehicles-marketplace/validation';
import { SearchService } from './search.service';

const canRunAgainstRealDb = process.env.API_TEST_HAS_REAL_DB === 'true';

function request(overrides: Partial<SearchRequest> = {}): SearchRequest {
  return { sort: 'RELEVANCE', page: 1, pageSize: 20, ...overrides };
}

describe.skipIf(!canRunAgainstRealDb)('SearchService', () => {
  const service = new SearchService(
    new LocalStorageService({ uploadRoot: '.', publicUploadUrl: 'http://localhost:3001/uploads' }),
  );

  const bmwMakeId = 'test-srch-bmw';
  const m4ModelId = `${bmwMakeId}-m4`;
  const m4GenerationId = `${m4ModelId}-g82`;
  const compXdriveId = `${m4GenerationId}-comp-xdrive`;

  const threeSeriesModelId = `${bmwMakeId}-3-series`;
  const threeSeriesGenerationId = `${threeSeriesModelId}-g20`;
  const threeTwentyId = `${threeSeriesGenerationId}-320i`;

  const audiMakeId = 'test-srch-audi';
  const rs4ModelId = `${audiMakeId}-rs4`;
  const rs4GenerationId = `${rs4ModelId}-b9`;
  const rs4Id = `${rs4GenerationId}-rs4`;

  const sellerId = 'test-srch-seller';

  const heatedSeatsId = 'test-srch-heated-seats';
  const adaptiveCruiseId = 'test-srch-adaptive-cruise';

  let compXdriveVehicleId: string;
  let threeTwentyVehicleId: string;
  let rs4VehicleId: string;
  let draftVehicleId: string;
  let soldVehicleId: string;

  let compXdriveListingId: string;
  let threeTwentyListingId: string;
  let rs4ListingId: string;

  // This fixture is bigger than most (two brands, three derivatives, five
  // vehicles/listings) — the default 5000ms hook timeout is too tight for
  // it under any real contention, so both hooks get a generous one.
  beforeEach(async () => {
    await db.user.create({
      data: { id: sellerId, email: `${sellerId}@example.com`, displayName: 'Seller' },
    });

    await db.make.create({ data: { id: bmwMakeId, name: 'Test Search BMW' } });
    await db.model.create({ data: { id: m4ModelId, makeId: bmwMakeId, name: 'M4' } });
    await db.generation.create({
      data: { id: m4GenerationId, modelId: m4ModelId, code: 'G82', productionStartYear: 2021 },
    });
    await db.derivative.create({
      data: {
        id: compXdriveId,
        generationId: m4GenerationId,
        name: 'M4 Competition xDrive',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'AWD',
        transmissions: ['AUTOMATIC'],
        engineFamily: 'S58',
        powerBhp: 503,
        torqueNm: 650,
        status: 'APPROVED',
      },
    });
    await db.catalogueAlias.create({
      data: {
        id: createId('cta'),
        entityType: 'DERIVATIVE',
        entityId: compXdriveId,
        alias: 'M4 Comp xDrive',
      },
    });

    await db.model.create({
      data: { id: threeSeriesModelId, makeId: bmwMakeId, name: '3 Series' },
    });
    await db.generation.create({
      data: {
        id: threeSeriesGenerationId,
        modelId: threeSeriesModelId,
        code: 'G20',
        productionStartYear: 2019,
      },
    });
    await db.derivative.create({
      data: {
        id: threeTwentyId,
        generationId: threeSeriesGenerationId,
        name: '320i SE',
        bodyStyle: 'SALOON',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        transmissions: ['AUTOMATIC', 'MANUAL'],
        powerBhp: 181,
        status: 'APPROVED',
      },
    });

    await db.make.create({ data: { id: audiMakeId, name: 'Test Search Audi' } });
    await db.model.create({ data: { id: rs4ModelId, makeId: audiMakeId, name: 'RS4' } });
    await db.generation.create({
      data: { id: rs4GenerationId, modelId: rs4ModelId, code: 'B9', productionStartYear: 2017 },
    });
    await db.derivative.create({
      data: {
        id: rs4Id,
        generationId: rs4GenerationId,
        name: 'RS4 Avant',
        bodyStyle: 'ESTATE',
        fuel: 'PETROL',
        drivetrain: 'AWD',
        transmissions: ['AUTOMATIC'],
        powerBhp: 450,
        status: 'APPROVED',
      },
    });

    await db.equipment.create({
      data: { id: heatedSeatsId, name: 'Heated Seats', category: 'COMFORT' },
    });
    await db.equipment.create({
      data: { id: adaptiveCruiseId, name: 'Adaptive Cruise', category: 'SAFETY' },
    });

    compXdriveVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: compXdriveVehicleId,
        ownerId: sellerId,
        derivativeId: compXdriveId,
        registration: 'SR01CXD',
        mileageMiles: 10_000,
        colourFamily: 'BLUE',
        firstRegisteredAt: new Date('2022-01-01'),
      },
    });
    await db.vehicleEquipment.createMany({
      data: [
        { id: createId('veq'), vehicleId: compXdriveVehicleId, equipmentId: heatedSeatsId },
        { id: createId('veq'), vehicleId: compXdriveVehicleId, equipmentId: adaptiveCruiseId },
      ],
    });

    threeTwentyVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: threeTwentyVehicleId,
        ownerId: sellerId,
        derivativeId: threeTwentyId,
        registration: 'SR02TWT',
        mileageMiles: 50_000,
        colourFamily: 'BLACK',
        firstRegisteredAt: new Date('2019-06-01'),
      },
    });
    await db.vehicleEquipment.create({
      data: { id: createId('veq'), vehicleId: threeTwentyVehicleId, equipmentId: heatedSeatsId },
    });

    rs4VehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: rs4VehicleId,
        ownerId: sellerId,
        derivativeId: rs4Id,
        registration: 'SR03RS4',
        mileageMiles: 20_000,
      },
    });

    draftVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: draftVehicleId,
        ownerId: sellerId,
        derivativeId: compXdriveId,
        registration: 'SR04DFT',
        mileageMiles: 1000,
      },
    });

    soldVehicleId = createId('veh');
    await db.vehicle.create({
      data: {
        id: soldVehicleId,
        ownerId: sellerId,
        derivativeId: compXdriveId,
        registration: 'SR05SLD',
        mileageMiles: 1000,
      },
    });

    // Macclesfield (SK) and central London (SW1A) — real, ~165 miles apart.
    compXdriveListingId = createId('lst');
    await db.listing.create({
      data: {
        id: compXdriveListingId,
        vehicleId: compXdriveVehicleId,
        sellerId,
        status: 'LIVE',
        pricePence: 6_000_000,
        locationPostcodeArea: 'SK',
        latitude: 53.2588,
        longitude: -2.1309,
        publishedAt: new Date('2026-01-01'),
      },
    });
    threeTwentyListingId = createId('lst');
    await db.listing.create({
      data: {
        id: threeTwentyListingId,
        vehicleId: threeTwentyVehicleId,
        sellerId,
        status: 'LIVE',
        pricePence: 1_500_000,
        locationPostcodeArea: 'SW',
        latitude: 51.5014,
        longitude: -0.1419,
        publishedAt: new Date('2026-01-02'),
      },
    });
    rs4ListingId = createId('lst');
    await db.listing.create({
      data: {
        id: rs4ListingId,
        vehicleId: rs4VehicleId,
        sellerId,
        status: 'RESERVED',
        pricePence: 4_000_000,
        publishedAt: new Date('2026-01-03'),
      },
    });
    await db.listing.create({
      data: {
        id: createId('lst'),
        vehicleId: draftVehicleId,
        sellerId,
        status: 'DRAFT',
        pricePence: 6_000_000,
      },
    });
    await db.listing.create({
      data: {
        id: createId('lst'),
        vehicleId: soldVehicleId,
        sellerId,
        status: 'SOLD',
        pricePence: 6_000_000,
      },
    });
  }, 20_000);

  afterEach(async () => {
    await db.listing.deleteMany({ where: { sellerId } });
    await db.vehicleEquipment.deleteMany({
      where: { vehicleId: { in: [compXdriveVehicleId, threeTwentyVehicleId] } },
    });
    await db.vehicle.deleteMany({ where: { ownerId: sellerId } });
    await db.equipment.deleteMany({ where: { id: { in: [heatedSeatsId, adaptiveCruiseId] } } });
    await db.catalogueAlias.deleteMany({ where: { entityId: compXdriveId } });
    await db.derivative.deleteMany({
      where: { generationId: { in: [m4GenerationId, threeSeriesGenerationId, rs4GenerationId] } },
    });
    await db.generation.deleteMany({
      where: { id: { in: [m4GenerationId, threeSeriesGenerationId, rs4GenerationId] } },
    });
    await db.model.deleteMany({
      where: { id: { in: [m4ModelId, threeSeriesModelId, rs4ModelId] } },
    });
    await db.make.deleteMany({ where: { id: { in: [bmwMakeId, audiMakeId] } } });
    await db.user.deleteMany({ where: { id: sellerId } });
  }, 20_000);

  it('never returns a DRAFT or SOLD listing, however permissive the filters', async () => {
    const result = await service.search(request());
    const ids = result.items.map((item) => item.listingId);
    expect(ids).toContain(compXdriveListingId);
    expect(ids).toContain(threeTwentyListingId);
    expect(ids).toContain(rs4ListingId);
    expect(result.items.every((item) => item.status === 'LIVE' || item.status === 'RESERVED')).toBe(
      true,
    );
  });

  it('matches "M4 Comp xDrive" via CatalogueAlias fuzzy matching, not an exact name match', async () => {
    const result = await service.search(request({ query: 'M4 Comp xDrive' }));
    const ids = result.items.map((item) => item.listingId);
    expect(ids).toContain(compXdriveListingId);
    expect(ids).not.toContain(threeTwentyListingId);
    expect(ids).not.toContain(rs4ListingId);
  });

  it('filters by make', async () => {
    const result = await service.search(request({ makeIds: [audiMakeId] }));
    const ids = result.items.map((item) => item.listingId);
    expect(ids).toEqual([rs4ListingId]);
  });

  it('filters by a combined price and mileage range', async () => {
    const result = await service.search(
      request({
        minPricePence: 5_000_000,
        maxPricePence: 7_000_000,
        minMileage: 5000,
        maxMileage: 15_000,
      }),
    );
    const ids = result.items.map((item) => item.listingId);
    expect(ids).toEqual([compXdriveListingId]);
  });

  it('filters by advanced fields (engine family, drivetrain, minimum power) combined', async () => {
    const result = await service.search(
      request({ engineFamily: ['S58'], drivetrain: ['AWD'], minPowerBhp: 490 }),
    );
    const ids = result.items.map((item) => item.listingId);
    expect(ids).toEqual([compXdriveListingId]);
  });

  it('matches equipment with AND semantics: both selected items required, not either', async () => {
    const both = await service.search(request({ equipmentIds: [heatedSeatsId, adaptiveCruiseId] }));
    expect(both.items.map((item) => item.listingId)).toEqual([compXdriveListingId]);

    const either = await service.search(request({ equipmentIds: [heatedSeatsId] }));
    const eitherIds = either.items.map((item) => item.listingId);
    expect(eitherIds).toContain(compXdriveListingId);
    expect(eitherIds).toContain(threeTwentyListingId);
  });

  it('sorts DISTANCE_ASC nearest-first against a real geocoded origin', async () => {
    const result = await service.search(
      request({
        originLatitude: 53.2588,
        originLongitude: -2.1309,
        sort: 'DISTANCE_ASC',
        makeIds: [bmwMakeId],
      }),
    );
    expect(result.items.map((item) => item.listingId)).toEqual([
      compXdriveListingId,
      threeTwentyListingId,
    ]);
    expect(result.items[0]?.distanceMiles).toBeLessThan(5);
    expect(result.items[1]?.distanceMiles).toBeGreaterThan(100);
  });

  it('returns a fresh searchId per call and a PageResponse-shaped page', async () => {
    const first = await service.search(request());
    const second = await service.search(request());
    expect(first.searchId).not.toBe(second.searchId);
    expect(first).toMatchObject({ page: 1, pageSize: 20 });
    expect(first.total).toBeGreaterThanOrEqual(3);
    expect(first.totalPages).toBeGreaterThanOrEqual(1);
  });
});
