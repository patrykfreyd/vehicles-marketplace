/**
 * Integration test against a real Postgres — see vitest.setup.ts for why
 * this skips instead of failing when no DATABASE_URL was actually
 * configured (mirrors apps/worker's pattern). Uses a throwaway make/model
 * name unlikely to collide with real catalogue data, and cleans up
 * everything it created afterward.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { importCatalogueFile } from './importer';
import { buildGenerationId, buildMakeId, buildModelId } from './slugs';

const canRunAgainstRealDb = process.env.CATALOGUE_CLI_TEST_HAS_REAL_INFRA === 'true';

const MAKE_NAME = 'Test Importer Make';
const MODEL_NAME = 'Test Model';
const makeId = buildMakeId(MAKE_NAME);
const modelId = buildModelId(makeId, MODEL_NAME);

async function cleanup(): Promise<void> {
  const generations = await db.generation.findMany({ where: { modelId }, select: { id: true } });
  const generationIds = generations.map((generation) => generation.id);
  const derivatives = await db.derivative.findMany({
    where: { generationId: { in: generationIds } },
    select: { id: true },
  });
  const derivativeIds = derivatives.map((derivative) => derivative.id);

  await db.catalogueValidationIssue.deleteMany({
    where: { entityId: { in: [...derivativeIds, ...generationIds] } },
  });
  await db.catalogueImport.deleteMany({ where: { manufacturerId: makeId } });
  await db.catalogueAlias.deleteMany({
    where: { entityId: { in: [...derivativeIds, ...generationIds] } },
  });
  await db.derivative.deleteMany({ where: { id: { in: derivativeIds } } });
  await db.generation.deleteMany({ where: { id: { in: generationIds } } });
  await db.model.deleteMany({ where: { id: modelId } });
  await db.make.deleteMany({ where: { id: makeId } });
}

describe.skipIf(!canRunAgainstRealDb)('importCatalogueFile', () => {
  afterEach(async () => {
    await cleanup();
  });

  it('imports a clean file: creates rows, defaults an unset status to IMPORTED, no issues', async () => {
    const raw = {
      make: MAKE_NAME,
      model: MODEL_NAME,
      generations: [
        {
          code: 'G01',
          productionStartYear: 2020,
          aliases: ['G01 Test'],
          derivatives: [
            {
              name: 'Test Model Base',
              bodyStyle: 'SALOON',
              fuel: 'PETROL',
              drivetrain: 'RWD',
              engineCapacityCc: 1998,
              cylinders: 4,
              configuration: 'INLINE_4',
              aspiration: 'TURBO',
              engineFamily: 'B48',
              powerBhp: 184,
              torqueNm: 300,
              transmissions: ['AUTOMATIC'],
              zeroToSixtyTwoSeconds: 7.1,
              topSpeedMph: 145,
            },
          ],
        },
      ],
    };

    const result = await importCatalogueFile({
      filePath: 'test.json',
      raw,
      expectedMakeId: makeId,
    });

    expect(result.ok).toBe(true);
    expect(result.recordsCreated).toBeGreaterThan(0);
    expect(result.issues).toEqual([]);

    const generationId = buildGenerationId(modelId, 'G01');
    const derivatives = await db.derivative.findMany({ where: { generationId } });
    expect(derivatives).toHaveLength(1);
    expect(derivatives[0]?.status).toBe('IMPORTED');
    expect(derivatives[0]?.completenessScore).toBe(100);

    const importRow = await db.catalogueImport.findFirst({ where: { manufacturerId: makeId } });
    expect(importRow?.warningsCount).toBe(0);
    expect(importRow?.errorsCount).toBe(0);
  });

  it('flags a missing-field derivative as REVIEW_REQUIRED with a WARNING issue', async () => {
    const raw = {
      make: MAKE_NAME,
      model: MODEL_NAME,
      generations: [
        {
          code: 'G01',
          productionStartYear: 2020,
          derivatives: [{ name: 'Sparse', bodyStyle: 'SALOON', fuel: 'PETROL', drivetrain: 'RWD' }],
        },
      ],
    };

    const result = await importCatalogueFile({
      filePath: 'test.json',
      raw,
      expectedMakeId: makeId,
    });

    expect(result.ok).toBe(true);
    const warnings = result.issues.filter((issue) => issue.severity === 'WARNING');
    expect(warnings.length).toBeGreaterThan(0);

    const generationId = buildGenerationId(modelId, 'G01');
    const [derivative] = await db.derivative.findMany({ where: { generationId } });
    expect(derivative?.status).toBe('REVIEW_REQUIRED');
  });

  it('rejects an APPROVED status from the file and records an ERROR issue instead', async () => {
    const raw = {
      make: MAKE_NAME,
      model: MODEL_NAME,
      generations: [
        {
          code: 'G01',
          productionStartYear: 2020,
          derivatives: [
            {
              name: 'Sneaky',
              bodyStyle: 'SALOON',
              fuel: 'PETROL',
              drivetrain: 'RWD',
              status: 'APPROVED',
            },
          ],
        },
      ],
    };

    const result = await importCatalogueFile({
      filePath: 'test.json',
      raw,
      expectedMakeId: makeId,
    });

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.severity === 'ERROR')).toBe(true);

    const generationId = buildGenerationId(modelId, 'G01');
    const [derivative] = await db.derivative.findMany({ where: { generationId } });
    expect(derivative?.status).not.toBe('APPROVED');
  });

  it('rejects a file whose make does not match the manufacturer directory it was imported under', async () => {
    const raw = { make: 'Some Other Make', model: MODEL_NAME, generations: [] };
    const result = await importCatalogueFile({
      filePath: 'test.json',
      raw,
      expectedMakeId: makeId,
    });
    expect(result.ok).toBe(false);
    expect(result.fileErrors.length).toBeGreaterThan(0);
  });

  it('is idempotent: importing the same file twice updates instead of duplicating', async () => {
    const raw = {
      make: MAKE_NAME,
      model: MODEL_NAME,
      generations: [
        {
          code: 'G01',
          productionStartYear: 2020,
          derivatives: [{ name: 'Repeat', bodyStyle: 'SALOON', fuel: 'PETROL', drivetrain: 'RWD' }],
        },
      ],
    };

    await importCatalogueFile({ filePath: 'test.json', raw, expectedMakeId: makeId });
    const second = await importCatalogueFile({
      filePath: 'test.json',
      raw,
      expectedMakeId: makeId,
    });

    expect(second.recordsCreated).toBe(0);
    expect(second.recordsUpdated).toBeGreaterThan(0);

    const generationId = buildGenerationId(modelId, 'G01');
    const derivatives = await db.derivative.findMany({ where: { generationId } });
    expect(derivatives).toHaveLength(1);
  });
});
