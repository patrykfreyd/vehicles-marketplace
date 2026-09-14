/**
 * plans/09-catalogue-import-tooling-admin.md §5's `catalogue import`
 * pipeline: validate -> normalized-key duplicate check -> controlled-value
 * check -> relationship check -> upsert -> write one `CatalogueImport` row
 * + any `CatalogueValidationIssue` rows -> return the summary the command
 * prints.
 *
 * "Controlled-value check" needs no separate step here: every enum field
 * (fuel, drivetrain, bodyStyle, ...) is already a Zod enum, so an invalid
 * value fails the schema-validation step below, same as any other shape
 * error. "Relationship check" (generation exists before its derivatives) is
 * structurally guaranteed by the nested staging JSON shape — a derivative
 * literally cannot appear without its parent generation in this format —
 * so the only relationship this pipeline actively checks is the one the
 * shape *can't* guarantee: a generation's own start/end year ordering.
 */
import {
  CatalogueModelFileSchema,
  computeCompletenessScore,
  findDuplicateCandidates,
  type CatalogueStatus,
  type DuplicateCandidateInput,
} from '@vehicles-marketplace/catalogue-types';
import { db, type Prisma } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import { buildCompletenessIssues, resolveImportStatus } from './import-rules';
import { buildDerivativeId, buildGenerationId, buildMakeId, buildModelId } from './slugs';

export interface ImportIssueSummary {
  severity: 'WARNING' | 'ERROR';
  entityType: 'GENERATION' | 'DERIVATIVE';
  /** The row's actual slug id — what `CatalogueValidationIssue.entityId` stores, so the Admin can look issues up by the same id it fetched the entity with. */
  entityId: string;
  /** Human-readable name, for CLI/summary printing only. */
  entityLabel: string;
  message: string;
}

export interface GenerationImportSummary {
  code: string;
  derivativeCount: number;
  ok: boolean;
}

export interface ImportFileResult {
  filePath: string;
  ok: boolean;
  make?: string;
  model?: string;
  generations: GenerationImportSummary[];
  recordsCreated: number;
  recordsUpdated: number;
  issues: ImportIssueSummary[];
  /** Top-level failures (bad shape, wrong manufacturer directory) that stopped the whole file before any row was touched. */
  fileErrors: string[];
}

async function replaceAliases(
  tx: Prisma.TransactionClient,
  entityType: 'GENERATION' | 'DERIVATIVE',
  entityId: string,
  aliases: string[],
): Promise<void> {
  await tx.catalogueAlias.deleteMany({ where: { entityType, entityId } });
  if (aliases.length === 0) return;
  await tx.catalogueAlias.createMany({
    data: aliases.map((alias) => ({ id: createId('alias'), entityType, entityId, alias })),
  });
}

export interface ImportCatalogueFileParams {
  filePath: string;
  raw: unknown;
  /** The `<manufacturer>` argument `catalogue import` was invoked with — the file's own `make` must resolve to this same slug (§5: importing under the wrong manufacturer directory is a mistake, not a silent cross-make import). */
  expectedMakeId: string;
  importedBy?: string;
}

export async function importCatalogueFile(
  params: ImportCatalogueFileParams,
): Promise<ImportFileResult> {
  const parsed = CatalogueModelFileSchema.safeParse(params.raw);
  if (!parsed.success) {
    const fileErrors = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    await db.catalogueImport.create({
      data: {
        id: createId('imp'),
        manufacturerId: params.expectedMakeId,
        filePath: params.filePath,
        importedBy: params.importedBy,
        recordsCreated: 0,
        recordsUpdated: 0,
        warningsCount: 0,
        errorsCount: fileErrors.length,
      },
    });
    return {
      filePath: params.filePath,
      ok: false,
      generations: [],
      recordsCreated: 0,
      recordsUpdated: 0,
      issues: [],
      fileErrors,
    };
  }

  const data = parsed.data;
  const makeId = buildMakeId(data.make);
  if (makeId !== params.expectedMakeId) {
    const fileErrors = [
      `File's make "${data.make}" resolves to "${makeId}", but was imported under manufacturer "${params.expectedMakeId}"`,
    ];
    await db.catalogueImport.create({
      data: {
        id: createId('imp'),
        manufacturerId: params.expectedMakeId,
        filePath: params.filePath,
        importedBy: params.importedBy,
        recordsCreated: 0,
        recordsUpdated: 0,
        warningsCount: 0,
        errorsCount: 1,
      },
    });
    return {
      filePath: params.filePath,
      ok: false,
      make: data.make,
      model: data.model,
      generations: [],
      recordsCreated: 0,
      recordsUpdated: 0,
      issues: [],
      fileErrors,
    };
  }

  const modelId = buildModelId(makeId, data.model);

  const result = await db.$transaction(async (tx) => {
    await tx.make.upsert({
      where: { id: makeId },
      create: { id: makeId, name: data.make },
      update: { name: data.make },
    });
    await tx.model.upsert({
      where: { id: modelId },
      create: { id: modelId, makeId, name: data.model },
      update: { name: data.model },
    });

    let recordsCreated = 0;
    let recordsUpdated = 0;
    const issues: ImportIssueSummary[] = [];
    const generationSummaries: GenerationImportSummary[] = [];
    const touchedDerivativeIds = new Set<string>();

    for (const [generationIndex, generation] of data.generations.entries()) {
      const generationId = buildGenerationId(modelId, generation.code);

      if (
        generation.productionEndYear !== undefined &&
        generation.productionEndYear < generation.productionStartYear
      ) {
        issues.push({
          severity: 'ERROR',
          entityType: 'GENERATION',
          entityId: generationId,
          entityLabel: generation.code,
          message: `productionEndYear (${generation.productionEndYear}) is before productionStartYear (${generation.productionStartYear})`,
        });
        generationSummaries.push({ code: generation.code, derivativeCount: 0, ok: false });
        continue;
      }

      const existingGeneration = await tx.generation.findUnique({ where: { id: generationId } });
      await tx.generation.upsert({
        where: { id: generationId },
        create: {
          id: generationId,
          modelId,
          code: generation.code,
          productionStartYear: generation.productionStartYear,
          productionEndYear: generation.productionEndYear,
        },
        update: {
          code: generation.code,
          productionStartYear: generation.productionStartYear,
          productionEndYear: generation.productionEndYear,
        },
      });
      if (existingGeneration) recordsUpdated += 1;
      else recordsCreated += 1;
      await replaceAliases(tx, 'GENERATION', generationId, generation.aliases);

      for (const [derivativeIndex, derivative] of generation.derivatives.entries()) {
        const derivativeId = buildDerivativeId(generationId, data.model, derivative.name);
        touchedDerivativeIds.add(derivativeId);
        const completenessScore = computeCompletenessScore(derivative);
        const completenessIssues = buildCompletenessIssues(derivative);

        // `derivative.status` is already Zod-defaulted by this point (to
        // 'AI_DRAFT' if the JSON omitted it) — we need the *raw* JSON's
        // value instead, to tell "the author explicitly wrote AI_DRAFT"
        // apart from "the author wrote nothing" (see import-rules.ts's
        // comment on why that distinction drives the default status).
        // Matched positionally (same array index the schema parsed from),
        // not by name — two derivatives can share a name mid-authoring.
        const rawGeneration = (params.raw as { generations?: unknown[] }).generations?.[
          generationIndex
        ] as { derivatives?: unknown[] } | undefined;
        const rawDerivative = rawGeneration?.derivatives?.[derivativeIndex] as
          { status?: unknown } | undefined;
        const rawStatus =
          typeof rawDerivative?.status === 'string' ? rawDerivative.status : undefined;

        const { status, rejectedApproval } = resolveImportStatus({
          rawStatus,
          hasIssues: completenessIssues.length > 0,
        });

        const derivativeIssues: ImportIssueSummary[] = completenessIssues.map((issue) => ({
          severity: issue.severity,
          entityType: 'DERIVATIVE',
          entityId: derivativeId,
          entityLabel: derivative.name,
          message: issue.message,
        }));
        if (rejectedApproval) {
          derivativeIssues.push({
            severity: 'ERROR',
            entityType: 'DERIVATIVE',
            entityId: derivativeId,
            entityLabel: derivative.name,
            message:
              'status "APPROVED" cannot be set via catalogue import — approve it from the Admin UI instead',
          });
        }
        issues.push(...derivativeIssues);

        const existingDerivative = await tx.derivative.findUnique({
          where: { id: derivativeId },
        });
        const derivativeData = {
          generationId,
          name: derivative.name,
          specialEdition: derivative.specialEdition,
          bodyStyle: derivative.bodyStyle,
          doors: derivative.doors,
          seats: derivative.seats,
          fuel: derivative.fuel,
          engineCapacityCc: derivative.engineCapacityCc,
          cylinders: derivative.cylinders,
          configuration: derivative.configuration,
          aspiration: derivative.aspiration,
          engineFamily: derivative.engineFamily,
          powerBhp: derivative.powerBhp,
          torqueNm: derivative.torqueNm,
          transmissions: derivative.transmissions,
          drivetrain: derivative.drivetrain,
          drivetrainManufacturerName: derivative.drivetrainManufacturerName,
          zeroToSixtyTwoSeconds: derivative.zeroToSixtyTwoSeconds,
          topSpeedMph: derivative.topSpeedMph,
          status: status as CatalogueStatus,
          confidence: derivative.confidence,
          reviewed: derivative.reviewed,
          completenessScore,
        };
        await tx.derivative.upsert({
          where: { id: derivativeId },
          create: { id: derivativeId, ...derivativeData },
          update: derivativeData,
        });
        if (existingDerivative) recordsUpdated += 1;
        else recordsCreated += 1;
        await replaceAliases(tx, 'DERIVATIVE', derivativeId, derivative.aliases);
      }

      generationSummaries.push({
        code: generation.code,
        derivativeCount: generation.derivatives.length,
        ok: true,
      });
    }

    // Normalized-key duplicate check (§3) across the whole make, not just
    // this file — flags a pair even when one half was imported previously.
    // Only groups touching *this* run are surfaced as issues on it, so
    // re-running import doesn't re-warn about a pre-existing pair nothing
    // here changed.
    const makeDerivatives = await tx.derivative.findMany({
      where: { generation: { model: { makeId } } },
      select: {
        id: true,
        name: true,
        bodyStyle: true,
        fuel: true,
        drivetrain: true,
        powerBhp: true,
        generation: { select: { code: true } },
      },
    });
    const duplicateInputs: DuplicateCandidateInput[] = makeDerivatives.map((derivative) => ({
      id: derivative.id,
      name: derivative.name,
      generationCode: derivative.generation.code,
      bodyStyle: derivative.bodyStyle,
      fuel: derivative.fuel,
      drivetrain: derivative.drivetrain,
      powerBhp: derivative.powerBhp,
    }));
    for (const group of findDuplicateCandidates(duplicateInputs)) {
      if (!group.items.some((item) => touchedDerivativeIds.has(item.id))) continue;
      for (const item of group.items) {
        issues.push({
          severity: 'WARNING',
          entityType: 'DERIVATIVE',
          entityId: item.id,
          entityLabel: item.name,
          message: `Possible duplicate of ${group.items
            .filter((other) => other.id !== item.id)
            .map((other) => other.id)
            .join(', ')} — resolve via the Admin's merge action`,
        });
      }
    }

    const warningsCount = issues.filter((issue) => issue.severity === 'WARNING').length;
    const errorsCount = issues.filter((issue) => issue.severity === 'ERROR').length;

    const importRow = await tx.catalogueImport.create({
      data: {
        id: createId('imp'),
        manufacturerId: makeId,
        filePath: params.filePath,
        importedBy: params.importedBy,
        recordsCreated,
        recordsUpdated,
        warningsCount,
        errorsCount,
      },
    });
    if (issues.length > 0) {
      await tx.catalogueValidationIssue.createMany({
        data: issues.map((issue) => ({
          id: createId('issue'),
          importId: importRow.id,
          entityType: issue.entityType,
          entityId: issue.entityId,
          severity: issue.severity,
          message: issue.message,
        })),
      });
    }

    return { recordsCreated, recordsUpdated, issues, generationSummaries };
  });

  return {
    filePath: params.filePath,
    ok: true,
    make: data.make,
    model: data.model,
    generations: result.generationSummaries,
    recordsCreated: result.recordsCreated,
    recordsUpdated: result.recordsUpdated,
    issues: result.issues,
    fileErrors: [],
  };
}
