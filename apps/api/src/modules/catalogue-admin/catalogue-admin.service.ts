/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the read/edit/approve/
 * reject/merge/alias/source logic backing the Catalogue Admin. Controllers
 * depend only on this service (Plan 05 §5's module template rule) — no
 * other module reaches into `db` for catalogue rows.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  computeCompletenessScore,
  findDuplicateCandidates,
  type DerivativeDetail,
  type DuplicateCandidateInput,
  type DuplicateGroup,
  type ManufacturerDetail,
  type ManufacturerSummary,
  type UpdateDerivativeRequest,
} from '@vehicles-marketplace/catalogue-types';
import { db, type CatalogueStatus, type Prisma } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

@Injectable()
export class CatalogueAdminService {
  async listManufacturers(
    sort: 'priority' | 'completeness' | 'name',
  ): Promise<ManufacturerSummary[]> {
    const makes = await db.make.findMany({
      include: { models: { include: { generations: { include: { derivatives: true } } } } },
    });

    const summaries: ManufacturerSummary[] = makes.map((make) => {
      const derivatives = make.models.flatMap((model) =>
        model.generations.flatMap((generation) => generation.derivatives),
      );
      const averageCompleteness = average(derivatives.map((d) => d.completenessScore));
      return {
        id: make.id,
        name: make.name,
        modelCount: make.models.length,
        derivativeCount: derivatives.length,
        averageCompleteness,
        // §2/§34: prioritize by incompleteness until real UK
        // prevalence/demand data exists — see ManufacturerSummarySchema's
        // own comment on why this is `100 - averageCompleteness`.
        priorityScore: 100 - averageCompleteness,
      };
    });

    switch (sort) {
      case 'name':
        return summaries.sort((a, b) => a.name.localeCompare(b.name));
      case 'completeness':
        return summaries.sort((a, b) => a.averageCompleteness - b.averageCompleteness);
      case 'priority':
      default:
        return summaries.sort((a, b) => b.priorityScore - a.priorityScore);
    }
  }

  async getManufacturerDetail(makeId: string): Promise<ManufacturerDetail | null> {
    const make = await db.make.findUnique({
      where: { id: makeId },
      include: { models: { include: { generations: { include: { derivatives: true } } } } },
    });
    if (!make) return null;

    const allDerivativeIds = make.models.flatMap((model) =>
      model.generations.flatMap((generation) => generation.derivatives.map((d) => d.id)),
    );
    const openIssueIds = new Set(
      (
        await db.catalogueValidationIssue.findMany({
          where: { entityType: 'DERIVATIVE', entityId: { in: allDerivativeIds }, resolved: false },
          select: { entityId: true },
        })
      ).map((issue) => issue.entityId),
    );

    return {
      id: make.id,
      name: make.name,
      models: make.models.map((model) => ({
        id: model.id,
        name: model.name,
        generations: model.generations.map((generation) => {
          const summaries = generation.derivatives.map((d) => ({
            id: d.id,
            name: d.name,
            status: d.status,
            completenessScore: d.completenessScore,
            hasOpenIssue: openIssueIds.has(d.id),
          }));
          return {
            id: generation.id,
            code: generation.code,
            productionStartYear: generation.productionStartYear,
            productionEndYear: generation.productionEndYear ?? undefined,
            derivativeCount: summaries.length,
            completeCount: summaries.filter((s) => s.completenessScore === 100 && !s.hasOpenIssue)
              .length,
            warningCount: summaries.filter((s) => s.hasOpenIssue).length,
            inProgressCount: summaries.filter((s) => !s.hasOpenIssue && s.completenessScore !== 100)
              .length,
            averageCompleteness: average(summaries.map((s) => s.completenessScore)),
            derivatives: summaries,
          };
        }),
      })),
    };
  }

  async getDerivativeDetail(derivativeId: string): Promise<DerivativeDetail | null> {
    const derivative = await db.derivative.findUnique({
      where: { id: derivativeId },
      include: { generation: { include: { model: { include: { make: true } } } } },
    });
    if (!derivative) return null;
    return this.toDetail(derivative);
  }

  async updateDerivative(
    derivativeId: string,
    patch: UpdateDerivativeRequest,
  ): Promise<DerivativeDetail> {
    const existing = await this.requireDerivative(derivativeId);
    const merged = { ...existing, ...patch };
    // Prisma's row has `number | null` for these; `computeCompletenessScore`
    // (built against the Zod entity shape) expects `number | undefined` —
    // both count as "absent" to `isFieldPresent`, so this is a type
    // normalization only, not a behavior change.
    const completenessScore = computeCompletenessScore({
      engineCapacityCc: merged.engineCapacityCc ?? undefined,
      cylinders: merged.cylinders ?? undefined,
      configuration: merged.configuration ?? undefined,
      aspiration: merged.aspiration ?? undefined,
      engineFamily: merged.engineFamily ?? undefined,
      powerBhp: merged.powerBhp ?? undefined,
      torqueNm: merged.torqueNm ?? undefined,
      transmissions: merged.transmissions,
      zeroToSixtyTwoSeconds: merged.zeroToSixtyTwoSeconds ?? undefined,
      topSpeedMph: merged.topSpeedMph ?? undefined,
    });

    const updated = await db.derivative.update({
      where: { id: derivativeId },
      data: { ...patch, completenessScore },
      include: { generation: { include: { model: { include: { make: true } } } } },
    });
    return this.toDetail(updated);
  }

  /** §6: SOURCE_CONFIRMED -> APPROVED, admin action only. */
  async approveDerivative(derivativeId: string): Promise<DerivativeDetail> {
    const existing = await this.requireDerivative(derivativeId);
    if (existing.status !== 'SOURCE_CONFIRMED' && existing.status !== 'APPROVED') {
      throw new ConflictException(
        `Cannot approve a derivative in status ${existing.status} — attach a source to move it to SOURCE_CONFIRMED first.`,
      );
    }
    const updated = await db.derivative.update({
      where: { id: derivativeId },
      data: { status: 'APPROVED', reviewed: true },
      include: { generation: { include: { model: { include: { make: true } } } } },
    });
    return this.toDetail(updated);
  }

  /** §7's "Reject" action — a terminal outcome for a record under review, not in §6's forward diagram; modeled as moving to DEPRECATED (this data will not be used), the diagram's own end state. */
  async rejectDerivative(derivativeId: string): Promise<DerivativeDetail> {
    await this.requireDerivative(derivativeId);
    const updated = await db.derivative.update({
      where: { id: derivativeId },
      data: { status: 'DEPRECATED', reviewed: true },
      include: { generation: { include: { model: { include: { make: true } } } } },
    });
    return this.toDetail(updated);
  }

  /** §7: combines a candidate duplicate's aliases/sources into the kept record, deprecating the other. Never automatic (§3/§5) — always one explicit admin action. */
  async mergeDerivatives(keepId: string, duplicateId: string): Promise<DerivativeDetail> {
    if (keepId === duplicateId) {
      throw new ConflictException('Cannot merge a derivative into itself');
    }
    await this.requireDerivative(keepId);
    const duplicate = await this.requireDerivative(duplicateId);

    await db.$transaction(async (tx) => {
      const duplicateAliases = await tx.catalogueAlias.findMany({
        where: { entityType: 'DERIVATIVE', entityId: duplicateId },
      });
      const keepAliases = new Set(
        (
          await tx.catalogueAlias.findMany({
            where: { entityType: 'DERIVATIVE', entityId: keepId },
          })
        ).map((alias) => alias.alias),
      );
      const newAliases = [
        ...new Set(
          [duplicate.name, ...duplicateAliases.map((a) => a.alias)].filter(
            (alias) => !keepAliases.has(alias),
          ),
        ),
      ];
      if (newAliases.length > 0) {
        await tx.catalogueAlias.createMany({
          data: newAliases.map((alias) => ({
            id: createId('alias'),
            entityType: 'DERIVATIVE' as const,
            entityId: keepId,
            alias,
          })),
        });
      }

      const duplicateSources = await tx.derivativeSource.findMany({
        where: { derivativeId: duplicateId },
      });
      for (const link of duplicateSources) {
        await tx.derivativeSource.upsert({
          where: { derivativeId_sourceId: { derivativeId: keepId, sourceId: link.sourceId } },
          create: { id: createId('dsrc'), derivativeId: keepId, sourceId: link.sourceId },
          update: {},
        });
      }

      await tx.derivative.update({
        where: { id: duplicateId },
        data: { status: 'DEPRECATED', reviewed: true },
      });
    });

    return this.requireDetail(keepId);
  }

  async addAlias(derivativeId: string, alias: string): Promise<DerivativeDetail> {
    await this.requireDerivative(derivativeId);
    await db.catalogueAlias.create({
      data: { id: createId('alias'), entityType: 'DERIVATIVE', entityId: derivativeId, alias },
    });
    return this.requireDetail(derivativeId);
  }

  async removeAlias(aliasId: string): Promise<void> {
    const alias = await db.catalogueAlias.findUnique({ where: { id: aliasId } });
    if (!alias) throw new NotFoundException('Alias not found');
    await db.catalogueAlias.delete({ where: { id: aliasId } });
  }

  /** §6: attaching a source is what moves REVIEW_REQUIRED -> SOURCE_CONFIRMED. */
  async addSource(
    derivativeId: string,
    input: { name: string; url?: string; licenseNote?: string },
  ): Promise<DerivativeDetail> {
    const derivative = await this.requireDerivative(derivativeId);

    await db.$transaction(async (tx) => {
      const source = await tx.catalogueSource.create({
        data: {
          id: createId('src'),
          name: input.name,
          url: input.url,
          licenseNote: input.licenseNote,
        },
      });
      await tx.derivativeSource.create({
        data: { id: createId('dsrc'), derivativeId, sourceId: source.id },
      });
      if (derivative.status === 'REVIEW_REQUIRED') {
        await tx.derivative.update({
          where: { id: derivativeId },
          data: { status: 'SOURCE_CONFIRMED' as CatalogueStatus },
        });
      }
    });

    return this.requireDetail(derivativeId);
  }

  async removeSource(derivativeSourceId: string): Promise<void> {
    const link = await db.derivativeSource.findUnique({ where: { id: derivativeSourceId } });
    if (!link) throw new NotFoundException('Source link not found');
    await db.derivativeSource.delete({ where: { id: derivativeSourceId } });
  }

  /** §5/§7's normalized-key duplicate check, surfaced for the Admin's merge flow — never auto-merges. */
  async findDuplicates(makeId: string): Promise<DuplicateGroup<DuplicateCandidateInput>[]> {
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
    const inputs: DuplicateCandidateInput[] = derivatives.map((d) => ({
      id: d.id,
      name: d.name,
      generationCode: d.generation.code,
      bodyStyle: d.bodyStyle,
      fuel: d.fuel,
      drivetrain: d.drivetrain,
      powerBhp: d.powerBhp,
    }));
    return findDuplicateCandidates(inputs);
  }

  private async requireDerivative(derivativeId: string) {
    const derivative = await db.derivative.findUnique({ where: { id: derivativeId } });
    if (!derivative) throw new NotFoundException('Derivative not found');
    return derivative;
  }

  private async requireDetail(derivativeId: string): Promise<DerivativeDetail> {
    const detail = await this.getDerivativeDetail(derivativeId);
    if (!detail) throw new NotFoundException('Derivative not found');
    return detail;
  }

  private async toDetail(
    derivative: Prisma.DerivativeGetPayload<{
      include: { generation: { include: { model: { include: { make: true } } } } };
    }>,
  ): Promise<DerivativeDetail> {
    const [aliases, issues, sourceLinks] = await Promise.all([
      db.catalogueAlias.findMany({ where: { entityType: 'DERIVATIVE', entityId: derivative.id } }),
      db.catalogueValidationIssue.findMany({
        where: { entityType: 'DERIVATIVE', entityId: derivative.id, resolved: false },
      }),
      db.derivativeSource.findMany({
        where: { derivativeId: derivative.id },
        include: { source: true },
      }),
    ]);

    return {
      id: derivative.id,
      generationId: derivative.generationId,
      name: derivative.name,
      specialEdition: derivative.specialEdition,
      bodyStyle: derivative.bodyStyle,
      doors: derivative.doors ?? undefined,
      seats: derivative.seats ?? undefined,
      fuel: derivative.fuel,
      engineCapacityCc: derivative.engineCapacityCc ?? undefined,
      cylinders: derivative.cylinders ?? undefined,
      configuration: derivative.configuration ?? undefined,
      aspiration: derivative.aspiration ?? undefined,
      engineFamily: derivative.engineFamily ?? undefined,
      powerBhp: derivative.powerBhp ?? undefined,
      torqueNm: derivative.torqueNm ?? undefined,
      transmissions: derivative.transmissions,
      drivetrain: derivative.drivetrain,
      drivetrainManufacturerName: derivative.drivetrainManufacturerName ?? undefined,
      zeroToSixtyTwoSeconds: derivative.zeroToSixtyTwoSeconds ?? undefined,
      topSpeedMph: derivative.topSpeedMph ?? undefined,
      status: derivative.status,
      confidence: derivative.confidence ?? undefined,
      reviewed: derivative.reviewed,
      completenessScore: derivative.completenessScore,
      aliases: aliases.map((a) => a.alias),
      aliasRecords: aliases.map((a) => ({ id: a.id, alias: a.alias })),
      createdAt: derivative.createdAt.toISOString(),
      updatedAt: derivative.updatedAt.toISOString(),
      makeId: derivative.generation.model.make.id,
      makeName: derivative.generation.model.make.name,
      modelId: derivative.generation.model.id,
      modelName: derivative.generation.model.name,
      generationCode: derivative.generation.code,
      issues: issues.map((issue) => ({
        id: issue.id,
        importId: issue.importId,
        entityType: issue.entityType,
        entityId: issue.entityId,
        severity: issue.severity,
        message: issue.message,
        resolved: issue.resolved,
        createdAt: issue.createdAt.toISOString(),
      })),
      sourceLinks: sourceLinks.map((link) => ({
        id: link.id,
        derivativeId: link.derivativeId,
        sourceId: link.sourceId,
        createdAt: link.createdAt.toISOString(),
        source: {
          id: link.source.id,
          name: link.source.name,
          url: link.source.url ?? undefined,
          licenseNote: link.source.licenseNote ?? undefined,
          createdAt: link.source.createdAt.toISOString(),
        },
      })),
    };
  }
}
