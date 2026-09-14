/**
 * plans/08-catalogue-data-model-json-schema.md §8 — a simple, transparent
 * weighted check across the Level 2 fields, computed once at import time
 * and stored on `Derivative.completenessScore` (not recomputed on every
 * read — Plan 09's Catalogue Admin lists hundreds of derivatives with
 * their completeness percentage).
 *
 * Identity (make/model/generation/derivative present) is required to have
 * a `Derivative` row at all, so it always contributes 100% and isn't part
 * of this ratio — only the ten genuinely optional Level 2 fields are.
 *
 * Note on the idea doc's own worked example (§33): it shows an Audi A4
 * missing torque/engine family/0-62 at "74%". Applying this formula to
 * that same set of missing fields (3 of the 10 below) gives
 * round(100 × 7/10) = 70%, not 74% — the idea doc's number was an
 * illustrative round figure written before this formula existed, not
 * derived from a precise field count. The 100% case reproduces exactly;
 * the incomplete case reproduces the same story (three specific fields
 * missing, most of the record present) at the value this plan's own
 * formula actually produces.
 */
import type { Derivative } from './entities/derivative';

const ENGINE_OPTIONAL_FIELDS = [
  'engineCapacityCc',
  'cylinders',
  'configuration',
  'aspiration',
  'engineFamily',
  'powerBhp',
  'torqueNm',
  'transmissions',
] as const;

const PERFORMANCE_OPTIONAL_FIELDS = ['zeroToSixtyTwoSeconds', 'topSpeedMph'] as const;

const COMPLETENESS_FIELDS = [...ENGINE_OPTIONAL_FIELDS, ...PERFORMANCE_OPTIONAL_FIELDS] as const;

export type CompletenessInput = Pick<Derivative, (typeof COMPLETENESS_FIELDS)[number]>;

function isFieldPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** `round(100 × presentOptionalFields / totalOptionalFields)`, per §8. */
export function computeCompletenessScore(derivative: CompletenessInput): number {
  const presentCount = COMPLETENESS_FIELDS.filter((field) =>
    isFieldPresent(derivative[field]),
  ).length;
  return Math.round((100 * presentCount) / COMPLETENESS_FIELDS.length);
}
