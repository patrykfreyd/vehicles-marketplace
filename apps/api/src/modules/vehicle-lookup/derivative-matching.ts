/**
 * plans/10-dvla-lookup-seller-matching.md §3 — the deterministic scoring
 * decision: "exact fuel match required; engine-capacity closeness within a
 * tolerance (±50cc), ranked ascending by difference — no ML." Kept as a
 * pure function (no Prisma/Nest types) so it's testable directly against
 * plain fixtures, same spirit as `@vehicles-marketplace/catalogue-types`'
 * `findDuplicateCandidates`/`computeCompletenessScore`.
 *
 * Generation narrowing (§2's flow diagram step 3, "System narrows
 * Generation by production-year range containing the reg year") happens
 * first, via each candidate's own `generationStartYear`/`generationEndYear`
 * — a derivative from a generation that doesn't cover the DVLA year is
 * never even fuel/engine-scored.
 */

export const ENGINE_CAPACITY_TOLERANCE_CC = 50;

export interface RankableDerivative {
  id: string;
  name: string;
  generationId: string;
  generationCode: string;
  generationStartYear: number;
  generationEndYear: number | null;
  fuel: string;
  engineCapacityCc: number | null;
  powerBhp: number | null;
  drivetrain: string;
  transmissions: string[];
  bodyStyle: string;
}

export interface DerivativeMatchInput {
  /** DVLA's `yearOfManufacture` — `null` narrows nothing (every generation passes). */
  year: number | null;
  /** DVLA's fuel, already mapped onto our `Fuel` enum — `null` (unmappable) means no candidate can ever match, by design (§3: "exact fuel match required"). */
  fuel: string | null;
  engineCapacityCc: number | null;
}

export interface RankedDerivative extends RankableDerivative {
  engineCapacityDiffCc: number | null;
  withinTolerance: boolean;
}

function generationCoversYear(
  derivative: Pick<RankableDerivative, 'generationStartYear' | 'generationEndYear'>,
  year: number,
): boolean {
  if (year < derivative.generationStartYear) return false;
  return derivative.generationEndYear === null || year <= derivative.generationEndYear;
}

/** Ranks `derivatives` against `input`, ascending by engine-capacity closeness. Derivatives outside the matched generation(s) or with no exact fuel match are excluded entirely, not just ranked last — an empty result is the intended signal to fall back to manual matching (§6). */
export function rankDerivativeCandidates(
  derivatives: RankableDerivative[],
  input: DerivativeMatchInput,
): RankedDerivative[] {
  if (input.fuel === null) return [];

  return derivatives
    .filter((d) => input.year === null || generationCoversYear(d, input.year))
    .filter((d) => d.fuel === input.fuel)
    .map((d) => {
      const engineCapacityDiffCc =
        d.engineCapacityCc !== null && input.engineCapacityCc !== null
          ? Math.abs(d.engineCapacityCc - input.engineCapacityCc)
          : null;
      return {
        ...d,
        engineCapacityDiffCc,
        withinTolerance:
          engineCapacityDiffCc !== null && engineCapacityDiffCc <= ENGINE_CAPACITY_TOLERANCE_CC,
      };
    })
    .sort((a, b) => {
      // No engine-capacity data to compare on always sorts last, never
      // excluded outright — an exact fuel + generation-year match is still
      // a reasonable suggestion even without a capacity to rank it by.
      if (a.engineCapacityDiffCc === null) return b.engineCapacityDiffCc === null ? 0 : 1;
      if (b.engineCapacityDiffCc === null) return -1;
      return a.engineCapacityDiffCc - b.engineCapacityDiffCc;
    });
}
