/**
 * plans/10-dvla-lookup-seller-matching.md §5 — the DVLA lookup + matching
 * flow's business logic. Controllers depend only on this service (Plan 05
 * §5's module template rule).
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { db, type Prisma } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type {
  BodyStyle,
  ConfirmVehicleLookupRequest,
  ConfirmVehicleLookupResponse,
  DerivativeCandidate,
  Drivetrain,
  DvlaLookupResult,
  FuelType,
  ListDerivativeCandidatesQuery,
  ListModelCandidatesQuery,
  ModelCandidate,
  PageResponse,
  Transmission,
} from '@vehicles-marketplace/validation';
import { normalizeRegistration } from '@vehicles-marketplace/validation';
import { DVLA_CLIENT } from './dvla/dvla-client.tokens';
import { DvlaNotFoundError, type DvlaClient, type DvlaVehicleData } from './dvla/dvla-client';
import { mapDvlaFuelType } from './dvla/fuel-mapping';
import { rankDerivativeCandidates, type RankableDerivative } from './derivative-matching';

@Injectable()
export class VehicleLookupService {
  constructor(@Inject(DVLA_CLIENT) private readonly dvlaClient: DvlaClient) {}

  /** §5's `POST /vehicle-lookup/dvla`. Never surfaces DVLA's raw error — a "not found" becomes a clear 404 (§6's field-error case); anything else (network/5xx) bubbles up as an unhandled error, masked and toasted per Plan 05 §4/§12.4's 5xx convention (§6's toast case). */
  async lookupByRegistration(userId: string, registrationInput: string): Promise<DvlaLookupResult> {
    const registration = normalizeRegistration(registrationInput);

    let vehicle: DvlaVehicleData;
    try {
      vehicle = await this.dvlaClient.lookup(registration);
    } catch (error) {
      if (error instanceof DvlaNotFoundError) {
        throw new NotFoundException("We couldn't find a vehicle with that registration.");
      }
      throw error;
    }

    const fuel = mapDvlaFuelType(vehicle.fuelType);
    const matchedMakeId = await this.resolveMakeId(vehicle.make);

    const lookup = await db.vehicleLookup.create({
      data: {
        id: createId('vlk'),
        registration,
        requestedByUserId: userId,
        dvlaMake: vehicle.make,
        dvlaYearOfManufacture: vehicle.yearOfManufacture,
        dvlaEngineCapacityCc: vehicle.engineCapacityCc,
        dvlaFuel: fuel ?? undefined,
        dvlaColour: vehicle.colour,
        dvlaTaxStatus: vehicle.taxStatus,
        dvlaMotStatus: vehicle.motStatus,
        dvlaMotExpiryDate: vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate) : undefined,
        dvlaRawResponse: (vehicle.raw ?? {}) as Prisma.InputJsonValue,
      },
    });

    return {
      id: lookup.id,
      registration: lookup.registration,
      make: lookup.dvlaMake ?? vehicle.make,
      matchedMakeId,
      yearOfManufacture: lookup.dvlaYearOfManufacture,
      engineCapacityCc: lookup.dvlaEngineCapacityCc,
      fuel: lookup.dvlaFuel,
      rawFuelType: vehicle.fuelType || null,
      colour: lookup.dvlaColour,
      taxStatus: lookup.dvlaTaxStatus,
      motStatus: lookup.dvlaMotStatus,
      motExpiryDate: lookup.dvlaMotExpiryDate ? lookup.dvlaMotExpiryDate.toISOString() : null,
    };
  }

  /** §5's `GET /vehicle-lookup/:id/model-candidates` — Plan 08's Model table, filtered by Make, for the seller's autocomplete. */
  async listModelCandidates(
    userId: string,
    lookupId: string,
    query: ListModelCandidatesQuery,
  ): Promise<PageResponse<ModelCandidate>> {
    await this.requireOwnedLookup(lookupId, userId);

    const where: Prisma.ModelWhereInput = {
      makeId: query.makeId,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };
    const models = await db.model.findMany({ where, orderBy: { name: 'asc' }, take: 100 });
    const items: ModelCandidate[] = models.map((model) => ({ id: model.id, name: model.name }));
    return toSinglePage(items);
  }

  /** §5's `GET /vehicle-lookup/:id/derivative-candidates` — §3's ranked shortlist within the selected Model, using this lookup's stored DVLA year/engine/fuel. Also persists the ranked id order onto the `VehicleLookup` row so `confirm()` can tell whether the seller picked the top suggestion without recomputing the ranking. */
  async listDerivativeCandidates(
    userId: string,
    lookupId: string,
    query: ListDerivativeCandidatesQuery,
  ): Promise<PageResponse<DerivativeCandidate>> {
    const lookup = await this.requireOwnedLookup(lookupId, userId);

    const model = await db.model.findUnique({
      where: { id: query.modelId },
      include: { generations: { include: { derivatives: { where: { status: 'APPROVED' } } } } },
    });
    if (!model) throw new NotFoundException('Model not found');

    const derivativesById = new Map<
      string,
      (typeof model.generations)[number]['derivatives'][number]
    >();
    const rankable: RankableDerivative[] = model.generations.flatMap((generation) =>
      generation.derivatives.map((derivative) => {
        derivativesById.set(derivative.id, derivative);
        return {
          id: derivative.id,
          name: derivative.name,
          generationId: generation.id,
          generationCode: generation.code,
          generationStartYear: generation.productionStartYear,
          generationEndYear: generation.productionEndYear,
          fuel: derivative.fuel,
          engineCapacityCc: derivative.engineCapacityCc,
          powerBhp: derivative.powerBhp,
          drivetrain: derivative.drivetrain,
          transmissions: derivative.transmissions,
          bodyStyle: derivative.bodyStyle,
        };
      }),
    );

    const ranked = rankDerivativeCandidates(rankable, {
      year: lookup.dvlaYearOfManufacture,
      fuel: lookup.dvlaFuel,
      engineCapacityCc: lookup.dvlaEngineCapacityCc,
    });

    await db.vehicleLookup.update({
      where: { id: lookupId },
      data: { candidateDerivativeIds: ranked.map((candidate) => candidate.id) },
    });

    // Re-hydrated from `derivativesById` rather than trusting `ranked`'s own
    // (deliberately loosened-to-`string`) enum fields — see
    // derivative-matching.ts's own comment on why that module stays
    // decoupled from Prisma/Zod's concrete enum types.
    const items: DerivativeCandidate[] = ranked.map((candidate) => {
      const derivative = derivativesById.get(candidate.id);
      if (!derivative) throw new Error(`Ranked candidate ${candidate.id} missing from source map`);
      return {
        id: derivative.id,
        name: derivative.name,
        generationId: candidate.generationId,
        generationCode: candidate.generationCode,
        fuel: derivative.fuel as FuelType,
        engineCapacityCc: derivative.engineCapacityCc,
        powerBhp: derivative.powerBhp,
        drivetrain: derivative.drivetrain as Drivetrain,
        transmissions: derivative.transmissions as Transmission[],
        bodyStyle: derivative.bodyStyle as BodyStyle,
        engineCapacityDiffCc: candidate.engineCapacityDiffCc,
        withinTolerance: candidate.withinTolerance,
      };
    });
    return toSinglePage(items);
  }

  /** §5's `POST /vehicle-lookup/:id/confirm` — §4's feedback signal: `predictionAccepted` is true only for a non-manual pick of the top-ranked candidate. */
  async confirm(
    userId: string,
    lookupId: string,
    input: ConfirmVehicleLookupRequest,
  ): Promise<ConfirmVehicleLookupResponse> {
    const lookup = await this.requireOwnedLookup(lookupId, userId);
    const topCandidateId = lookup.candidateDerivativeIds[0] ?? null;
    const predictionAccepted =
      !input.matchedManually && topCandidateId !== null && topCandidateId === input.derivativeId;

    const updated = await db.vehicleLookup.update({
      where: { id: lookupId },
      data: {
        selectedDerivativeId: input.derivativeId,
        matchedManually: input.matchedManually,
        predictionAccepted,
      },
    });

    return {
      id: updated.id,
      // Set unconditionally above, so always present on the just-updated row.
      selectedDerivativeId: updated.selectedDerivativeId as string,
      matchedManually: updated.matchedManually,
      predictionAccepted: updated.predictionAccepted as boolean,
    };
  }

  /** Best-effort match of DVLA's free-text make string onto Plan 08's `Make` table — exact name first, then a `CatalogueAlias` (entityType `MAKE`) for known manufacturer-name variants. `null` (no match) is a valid outcome the UI falls back to manual Make selection for, not an error. */
  private async resolveMakeId(dvlaMakeText: string): Promise<string | null> {
    const normalized = dvlaMakeText.trim();
    if (!normalized) return null;

    const byName = await db.make.findFirst({
      where: { name: { equals: normalized, mode: 'insensitive' } },
    });
    if (byName) return byName.id;

    const alias = await db.catalogueAlias.findFirst({
      where: { entityType: 'MAKE', alias: { equals: normalized, mode: 'insensitive' } },
    });
    return alias?.entityId ?? null;
  }

  /** Every other method scopes by this — a lookup only its own requester can read or act on (§5: prevents one seller probing/confirming another's registration lookup). Returns 404, not 403, so a guessed id doesn't confirm its own existence either. */
  private async requireOwnedLookup(lookupId: string, userId: string) {
    const lookup = await db.vehicleLookup.findUnique({ where: { id: lookupId } });
    if (!lookup || lookup.requestedByUserId !== userId) {
      throw new NotFoundException('Vehicle lookup not found');
    }
    return lookup;
  }
}

/** Every non-catalogue list endpoint in this module returns an inherently small, unpaginated shortlist (Models under one Make, ranked Derivatives within a matched generation) — still wrapped in `PageResponseSchema` per Plan 05 §4's "never a bare array" rule, just always as a single page. */
function toSinglePage<T>(items: T[]): PageResponse<T> {
  return {
    items,
    page: 1,
    pageSize: Math.max(items.length, 1),
    total: items.length,
    totalPages: 1,
  };
}
