import { z } from 'zod';

/**
 * Catalogue entities use stable, human-readable slug IDs (`bmw`,
 * `bmw-m4`, `bmw-m4-g82`, `bmw-m4-g82-competition-xdrive`), never a
 * displayed name treated as the identifier — see
 * plans/03-shared-types-validation.md §5 and idea doc §29. Lowercase
 * ASCII words joined by single hyphens, matching the idea doc's own
 * examples.
 */
export const CatalogueSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase-hyphenated slug, e.g. "bmw-m4-g82"');

export type CatalogueSlug = z.infer<typeof CatalogueSlugSchema>;
