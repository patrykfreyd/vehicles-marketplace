/**
 * plans/08-catalogue-data-model-json-schema.md §6/§7/§10 — the nested JSON
 * *staging* shape a human/AI author writes one file per make+model
 * against (idea doc §23's `catalogue/<make>/<model>.json` layout, e.g.
 * `catalogue/bmw/m4.json`), as opposed to the flat, DB-row-shaped entity
 * schemas in `../entities`.
 *
 * The two shapes differ only in what the position in the tree already
 * tells you: nested under a generation, a derivative doesn't need to
 * repeat `generationId`; nested under a model file, a generation doesn't
 * need to repeat `modelId`. Plan 09's importer is what computes those
 * slug IDs from the tree position and the entity's own name/code when it
 * flattens an authored file into `Generation`/`Derivative` rows.
 */
import { z } from 'zod';
import { DerivativeSchema } from '../entities/derivative';
import { GenerationSchema } from '../entities/generation';

export const DerivativeStagingSchema = DerivativeSchema.omit({
  id: true,
  generationId: true,
});

export type DerivativeStaging = z.infer<typeof DerivativeStagingSchema>;

export const GenerationStagingSchema = GenerationSchema.omit({
  id: true,
  modelId: true,
}).extend({
  derivatives: z.array(DerivativeStagingSchema).min(1),
});

export type GenerationStaging = z.infer<typeof GenerationStagingSchema>;

/** One `catalogue/<make>/<model>.json` file — everything for a single model. */
export const CatalogueModelFileSchema = z.object({
  make: z.string().min(1), // "BMW" — resolved against Make.name/id by the importer
  model: z.string().min(1), // "M4"
  generations: z.array(GenerationStagingSchema).min(1),
});

export type CatalogueModelFile = z.infer<typeof CatalogueModelFileSchema>;
