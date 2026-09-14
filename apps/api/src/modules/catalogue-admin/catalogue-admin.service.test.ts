/**
 * Integration test against a real Postgres — see vitest.setup.ts for why
 * this skips instead of failing without one (mirrors apps/worker's
 * pattern). Builds its own throwaway make/model/generation/derivative rows
 * directly via `db`, independent of the CLI's importer, and cleans up
 * everything it created afterward.
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import { CatalogueAdminService } from './catalogue-admin.service';

const canRunAgainstRealDb = process.env.API_TEST_HAS_REAL_DB === 'true';

describe.skipIf(!canRunAgainstRealDb)('CatalogueAdminService', () => {
  const service = new CatalogueAdminService();
  const makeId = 'test-admin-make';
  const modelId = `${makeId}-model`;
  const generationId = `${modelId}-g1`;
  // Deterministic, not assigned inside beforeEach — so afterEach can still
  // clean up correctly even if beforeEach fails partway through (e.g. a
  // connection-pool timeout under a full monorepo-wide test run hitting one
  // shared local Postgres), instead of referencing an unset `let` and
  // throwing its own separate error on top of the original failure.
  const derivativeId = `${generationId}-base`;
  const otherDerivativeId = `${generationId}-base-2`;

  beforeEach(async () => {
    await db.make.create({ data: { id: makeId, name: 'Test Admin Make' } });
    await db.model.create({ data: { id: modelId, makeId, name: 'Test Model' } });
    await db.generation.create({
      data: { id: generationId, modelId, code: 'G1', productionStartYear: 2020 },
    });
    await db.derivative.create({
      data: {
        id: derivativeId,
        generationId,
        name: 'Base',
        bodyStyle: 'SALOON',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        status: 'REVIEW_REQUIRED',
        completenessScore: 50,
      },
    });

    await db.derivative.create({
      data: {
        id: otherDerivativeId,
        generationId,
        // Same normalized duplicate key as "Base" (case-insensitive,
        // whitespace/punctuation-stripped — see packages/catalogue-types'
        // duplicates.ts) with the same bodyStyle/fuel/drivetrain/powerBhp —
        // a deliberately near-identical second entry of the same car, the
        // scenario findDuplicates below is proving.
        name: 'BASE',
        bodyStyle: 'SALOON',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        status: 'REVIEW_REQUIRED',
        completenessScore: 40,
      },
    });
  });

  afterEach(async () => {
    await db.derivativeSource.deleteMany({
      where: { derivativeId: { in: [derivativeId, otherDerivativeId] } },
    });
    await db.catalogueSource.deleteMany({ where: { name: { startsWith: 'Test Source' } } });
    await db.catalogueAlias.deleteMany({
      where: { entityType: 'DERIVATIVE', entityId: { in: [derivativeId, otherDerivativeId] } },
    });
    await db.derivative.deleteMany({ where: { generationId } });
    await db.generation.deleteMany({ where: { id: generationId } });
    await db.model.deleteMany({ where: { id: modelId } });
    await db.make.deleteMany({ where: { id: makeId } });
  });

  it('lists the manufacturer with correct aggregate completeness', async () => {
    const list = await service.listManufacturers('name');
    const entry = list.find((m) => m.id === makeId);
    expect(entry).toMatchObject({ modelCount: 1, derivativeCount: 2, averageCompleteness: 45 });
  });

  it('returns manufacturer detail with per-generation counts', async () => {
    const detail = await service.getManufacturerDetail(makeId);
    expect(detail?.models[0]?.generations[0]).toMatchObject({
      code: 'G1',
      derivativeCount: 2,
      inProgressCount: 2,
    });
  });

  it('returns null for an unknown manufacturer', async () => {
    expect(await service.getManufacturerDetail('does-not-exist')).toBeNull();
  });

  it('returns derivative detail with make/model/generation context', async () => {
    const detail = await service.getDerivativeDetail(derivativeId);
    expect(detail).toMatchObject({ makeId, modelId, generationCode: 'G1', name: 'Base' });
  });

  it('updates a derivative and recomputes completenessScore', async () => {
    const updated = await service.updateDerivative(derivativeId, {
      powerBhp: 200,
      torqueNm: 300,
      engineCapacityCc: 1998,
      cylinders: 4,
      configuration: 'INLINE_4',
      aspiration: 'TURBO',
      engineFamily: 'B48',
      transmissions: ['AUTOMATIC'],
      zeroToSixtyTwoSeconds: 7,
      topSpeedMph: 140,
    });
    expect(updated.completenessScore).toBe(100);
  });

  it('refuses to approve a derivative that is not SOURCE_CONFIRMED', async () => {
    await expect(service.approveDerivative(derivativeId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('attaching a source moves REVIEW_REQUIRED to SOURCE_CONFIRMED, then approve succeeds', async () => {
    const afterSource = await service.addSource(derivativeId, { name: 'Test Source A' });
    expect(afterSource.status).toBe('SOURCE_CONFIRMED');
    expect(afterSource.sourceLinks).toHaveLength(1);

    const approved = await service.approveDerivative(derivativeId);
    expect(approved.status).toBe('APPROVED');
  });

  it('removes a source link', async () => {
    const withSource = await service.addSource(derivativeId, { name: 'Test Source B' });
    const linkId = withSource.sourceLinks[0]!.id;
    await service.removeSource(linkId);
    const after = await service.getDerivativeDetail(derivativeId);
    expect(after?.sourceLinks).toHaveLength(0);
  });

  it('adds and removes an alias', async () => {
    const withAlias = await service.addAlias(derivativeId, 'Base Trim');
    expect(withAlias.aliases).toContain('Base Trim');

    const alias = await db.catalogueAlias.findFirst({
      where: { entityType: 'DERIVATIVE', entityId: derivativeId, alias: 'Base Trim' },
    });
    await service.removeAlias(alias!.id);
    const after = await service.getDerivativeDetail(derivativeId);
    expect(after?.aliases).not.toContain('Base Trim');
  });

  it('rejects a derivative, moving it to DEPRECATED', async () => {
    const rejected = await service.rejectDerivative(derivativeId);
    expect(rejected.status).toBe('DEPRECATED');
  });

  it('finds the duplicate pair created in beforeEach', async () => {
    const groups = await service.findDuplicates(makeId);
    const group = groups.find((g) => g.items.some((item) => item.id === derivativeId));
    expect(group?.items.map((item) => item.id).sort()).toEqual(
      [derivativeId, otherDerivativeId].sort(),
    );
  });

  it('merges a duplicate into the kept derivative, deprecating the other', async () => {
    await db.catalogueAlias.create({
      data: {
        id: createId('alias'),
        entityType: 'DERIVATIVE',
        entityId: otherDerivativeId,
        alias: 'Other Alias',
      },
    });

    const merged = await service.mergeDerivatives(derivativeId, otherDerivativeId);
    expect(merged.aliases).toEqual(expect.arrayContaining(['BASE', 'Other Alias']));

    const duplicate = await db.derivative.findUnique({ where: { id: otherDerivativeId } });
    expect(duplicate?.status).toBe('DEPRECATED');
  });

  it('throws NotFoundException for an unknown derivative id', async () => {
    await expect(service.getDerivativeDetail('does-not-exist')).resolves.toBeNull();
    await expect(service.approveDerivative('does-not-exist')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
