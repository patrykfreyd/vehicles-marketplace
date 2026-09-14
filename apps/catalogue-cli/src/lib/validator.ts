/**
 * plans/09-catalogue-import-tooling-admin.md §5 — `catalogue validate`:
 * "runs the file through packages/catalogue-types' Zod schemas, prints
 * pass/fail per entity, no DB writes."
 *
 * `CatalogueModelFileSchema` alone only gives a single pass/fail for the
 * whole file — fine for `import` (§6: a file either imports cleanly or it
 * doesn't), but not granular enough for a human debugging *which*
 * generation/derivative in a large file is wrong. This walks the raw JSON
 * and re-validates each generation/derivative individually (in addition to
 * the file as a whole) so a failure points at one entity, not the file.
 */
import { z } from 'zod';
import {
  DerivativeStagingSchema,
  GenerationStagingSchema,
} from '@vehicles-marketplace/catalogue-types';

const TopLevelShapeSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  generations: z.array(z.unknown()),
});

export interface EntityValidationResult {
  entityType: 'MAKE' | 'MODEL' | 'GENERATION' | 'DERIVATIVE';
  label: string;
  ok: boolean;
  errors: string[];
}

export interface ValidateFileReport {
  filePath: string;
  results: EntityValidationResult[];
  ok: boolean;
}

function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function validateCatalogueFile(filePath: string, raw: unknown): ValidateFileReport {
  const results: EntityValidationResult[] = [];

  const topLevel = TopLevelShapeSchema.safeParse(raw);
  if (!topLevel.success) {
    results.push({
      entityType: 'MODEL',
      label: filePath,
      ok: false,
      errors: formatZodErrors(topLevel.error),
    });
    return { filePath, results, ok: false };
  }

  const { make, model, generations } = topLevel.data;
  results.push({ entityType: 'MAKE', label: make, ok: true, errors: [] });
  results.push({ entityType: 'MODEL', label: model, ok: true, errors: [] });

  for (const [generationIndex, rawGeneration] of generations.entries()) {
    const generationRecord = (rawGeneration ?? {}) as Record<string, unknown>;
    const generationLabel =
      typeof generationRecord.code === 'string'
        ? generationRecord.code
        : `generation #${generationIndex + 1}`;

    const generationResult = GenerationStagingSchema.safeParse(rawGeneration);
    results.push({
      entityType: 'GENERATION',
      label: generationLabel,
      ok: generationResult.success,
      errors: generationResult.success ? [] : formatZodErrors(generationResult.error),
    });

    const rawDerivatives = Array.isArray(generationRecord.derivatives)
      ? generationRecord.derivatives
      : [];
    for (const [derivativeIndex, rawDerivative] of rawDerivatives.entries()) {
      const derivativeRecord = (rawDerivative ?? {}) as Record<string, unknown>;
      const derivativeLabel =
        typeof derivativeRecord.name === 'string'
          ? `${derivativeRecord.name} (${generationLabel})`
          : `${generationLabel} derivative #${derivativeIndex + 1}`;

      const derivativeResult = DerivativeStagingSchema.safeParse(rawDerivative);
      results.push({
        entityType: 'DERIVATIVE',
        label: derivativeLabel,
        ok: derivativeResult.success,
        errors: derivativeResult.success ? [] : formatZodErrors(derivativeResult.error),
      });
    }
  }

  return { filePath, results, ok: results.every((result) => result.ok) };
}
