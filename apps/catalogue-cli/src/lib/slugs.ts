/**
 * plans/09-catalogue-import-tooling-admin.md §5 — the importer is what
 * computes catalogue entities' slug IDs from their tree position and own
 * name/code (see `catalogue-model-file.ts`'s top comment in
 * `@vehicles-marketplace/catalogue-types`), since the staging JSON format
 * never carries them. Every id produced here must satisfy
 * `CatalogueSlugSchema` (lowercase, hyphen-joined ASCII words).
 */

/** Lowercases, replaces anything that isn't a-z/0-9 with a hyphen, trims stray hyphens. */
export function slugifyPart(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildMakeId(makeName: string): string {
  return slugifyPart(makeName);
}

export function buildModelId(makeId: string, modelName: string): string {
  return `${makeId}-${slugifyPart(modelName)}`;
}

export function buildGenerationId(modelId: string, generationCode: string): string {
  return `${modelId}-${slugifyPart(generationCode)}`;
}

/**
 * A derivative's name usually repeats its model's name ("M4 Competition
 * xDrive" under model "M4") — stripping that leading, redundant word keeps
 * the id close to the short human-written ids used in the plan's own
 * examples ("bmw-m4-g82-competition-xdrive", not
 * "bmw-m4-g82-m4-competition-xdrive"). Falls back to the full slug when
 * that would leave nothing (a derivative named exactly after its model,
 * e.g. base "M4"), so no id is ever empty or collides with its own
 * generation id.
 */
export function buildDerivativeId(
  generationId: string,
  modelName: string,
  derivativeName: string,
): string {
  const derivativeSlug = slugifyPart(derivativeName);
  const modelSlug = slugifyPart(modelName);
  const withoutModelPrefix = derivativeSlug.startsWith(`${modelSlug}-`)
    ? derivativeSlug.slice(modelSlug.length + 1)
    : derivativeSlug;
  const suffix = withoutModelPrefix.length > 0 ? withoutModelPrefix : derivativeSlug;
  return `${generationId}-${suffix}`;
}
