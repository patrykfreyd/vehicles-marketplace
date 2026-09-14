/**
 * Integration test against a real Postgres — see apps/api/vitest.setup.ts
 * for why this skips instead of failing without one.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { CatalogueService } from './catalogue.service';

const canRunAgainstRealDb = process.env.API_TEST_HAS_REAL_DB === 'true';

describe.skipIf(!canRunAgainstRealDb)('CatalogueService', () => {
  const service = new CatalogueService();
  const makeId = 'test-published-make';
  const modelId = `${makeId}-model`;
  const generationId = `${modelId}-g1`;
  const approvedId = `${generationId}-approved`;
  const draftId = `${generationId}-draft`;

  beforeEach(async () => {
    await db.make.create({ data: { id: makeId, name: 'Test Published Make' } });
    await db.model.create({ data: { id: modelId, makeId, name: 'Test Model' } });
    await db.generation.create({
      data: { id: generationId, modelId, code: 'G1', productionStartYear: 2020 },
    });
    await db.derivative.create({
      data: {
        id: approvedId,
        generationId,
        name: 'Approved Trim',
        bodyStyle: 'SALOON',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        status: 'APPROVED',
      },
    });
    await db.derivative.create({
      data: {
        id: draftId,
        generationId,
        name: 'Draft Trim',
        bodyStyle: 'SALOON',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        status: 'AI_DRAFT',
      },
    });
  });

  afterEach(async () => {
    await db.derivative.deleteMany({ where: { generationId } });
    await db.generation.deleteMany({ where: { id: generationId } });
    await db.model.deleteMany({ where: { id: modelId } });
    await db.make.deleteMany({ where: { id: makeId } });
  });

  it('returns only APPROVED derivatives, never AI_DRAFT/REVIEW_REQUIRED/etc.', async () => {
    const page = await service.listPublishedDerivatives({ page: 1, pageSize: 20 });
    const ids = page.items.map((item) => item.id);
    expect(ids).toContain(approvedId);
    expect(ids).not.toContain(draftId);
    expect(page.items.every((item) => item.status === 'APPROVED')).toBe(true);
  });
});
