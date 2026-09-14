/**
 * DB-touching reads backing `report`/`completeness`/`find-duplicates`
 * (plans/09-catalogue-import-tooling-admin.md §5). Kept deliberately thin —
 * fetch rows, shape them into the plain inputs `report.ts`/`duplicates.ts`
 * (both DB-free and unit-tested) already know how to turn into output —
 * rather than mixing DB access into the formatting logic itself.
 */
import type { DuplicateCandidateInput } from '@vehicles-marketplace/catalogue-types';
import { db } from '@vehicles-marketplace/db';
import type { DerivativeSummary, MakeReport, ModelReport } from './report';
import { averageCompleteness, summarizeModelStatus } from './report';

async function buildMakeReport(makeId: string, makeName: string): Promise<MakeReport> {
  const models = await db.model.findMany({
    where: { makeId },
    include: {
      generations: {
        include: {
          derivatives: {
            select: { id: true, completenessScore: true },
          },
        },
      },
    },
  });

  const derivativeIds = models.flatMap((model) =>
    model.generations.flatMap((generation) => generation.derivatives.map((d) => d.id)),
  );
  const openIssueEntityIds = new Set(
    (
      await db.catalogueValidationIssue.findMany({
        where: { entityType: 'DERIVATIVE', entityId: { in: derivativeIds }, resolved: false },
        select: { entityId: true },
      })
    ).map((issue) => issue.entityId),
  );

  const modelReports: ModelReport[] = [];
  const allDerivatives: DerivativeSummary[] = [];

  for (const model of models) {
    const derivatives: DerivativeSummary[] = model.generations.flatMap((generation) =>
      generation.derivatives.map((derivative) => ({
        completenessScore: derivative.completenessScore,
        hasOpenIssue: openIssueEntityIds.has(derivative.id),
      })),
    );
    allDerivatives.push(...derivatives);
    modelReports.push({
      name: model.name,
      status: summarizeModelStatus(derivatives),
      averageCompleteness: averageCompleteness(derivatives),
      derivativeCount: derivatives.length,
    });
  }

  return {
    id: makeId,
    name: makeName,
    averageCompleteness: averageCompleteness(allDerivatives),
    models: modelReports,
  };
}

export async function getMakeReport(makeId: string): Promise<MakeReport | null> {
  const make = await db.make.findUnique({ where: { id: makeId } });
  if (!make) return null;
  return buildMakeReport(make.id, make.name);
}

/** `catalogue completeness`: every make that has at least one model. */
export async function getAllMakeReports(): Promise<MakeReport[]> {
  const makes = await db.make.findMany();
  return Promise.all(makes.map((make) => buildMakeReport(make.id, make.name)));
}

export async function getMakeDuplicateCandidateInputs(
  makeId: string,
): Promise<DuplicateCandidateInput[]> {
  const derivatives = await db.derivative.findMany({
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
  return derivatives.map((derivative) => ({
    id: derivative.id,
    name: derivative.name,
    generationCode: derivative.generation.code,
    bodyStyle: derivative.bodyStyle,
    fuel: derivative.fuel,
    drivetrain: derivative.drivetrain,
    powerBhp: derivative.powerBhp,
  }));
}
