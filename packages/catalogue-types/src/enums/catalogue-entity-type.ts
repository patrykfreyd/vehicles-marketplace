/**
 * plans/08-catalogue-data-model-json-schema.md §3/§4 — the discriminator
 * on the generic `CatalogueAlias` table, letting one alias lookup shape
 * cover generations, derivatives, engine families (a plain string, not
 * its own table) and manufacturer paint names uniformly (§10 acceptance
 * criterion: at least two different `entityType` values through one
 * shared query shape).
 */
import { z } from 'zod';

export const CatalogueEntityTypeSchema = z.enum([
  'MAKE',
  'MODEL',
  'GENERATION',
  'DERIVATIVE',
  'ENGINE_FAMILY',
  'MANUFACTURER_COLOUR',
]);

export type CatalogueEntityType = z.infer<typeof CatalogueEntityTypeSchema>;
