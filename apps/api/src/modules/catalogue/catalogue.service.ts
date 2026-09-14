/**
 * plans/09-catalogue-import-tooling-admin.md §9's acceptance criterion:
 * "Only APPROVED derivatives are returned by a basic 'list published
 * catalogue' query used as this plan's stand-in for Plan 13's future search
 * integration." A throwaway proof, same spirit as Plan 05's `HealthModule`
 * — Plan 13 replaces this with real search.
 */
import { Injectable } from '@nestjs/common';
import type { PageRequest, PageResponse } from '@vehicles-marketplace/validation';
import type { PublishedDerivative } from '@vehicles-marketplace/catalogue-types';
import { db } from '@vehicles-marketplace/db';

@Injectable()
export class CatalogueService {
  async listPublishedDerivatives(page: PageRequest): Promise<PageResponse<PublishedDerivative>> {
    const where = { status: 'APPROVED' as const };
    const [rows, total] = await Promise.all([
      db.derivative.findMany({
        where,
        include: { generation: { include: { model: { include: { make: true } } } } },
        orderBy: { name: 'asc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      db.derivative.count({ where }),
    ]);

    const items: PublishedDerivative[] = rows.map((derivative) => ({
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
      // Not fetched for a list view (would be an N+1 per row) — aliases
      // matter for `catalogue-admin`'s derivative detail screen, not this
      // throwaway published-list proof.
      aliases: [],
      createdAt: derivative.createdAt.toISOString(),
      updatedAt: derivative.updatedAt.toISOString(),
      makeName: derivative.generation.model.make.name,
      modelName: derivative.generation.model.name,
      generationCode: derivative.generation.code,
    }));

    return {
      items,
      page: page.page,
      pageSize: page.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / page.pageSize)),
    };
  }
}
