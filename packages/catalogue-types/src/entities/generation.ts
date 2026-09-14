/**
 * plans/08-catalogue-data-model-json-schema.md §5/§6 — mirrors the
 * `Generation` Prisma model. `aliases` isn't a DB column (it's normalized
 * into `CatalogueAlias` on import, per §2/§6) but is part of this same
 * schema because it's authored alongside the entity in the JSON staging
 * format — see `../staging/catalogue-model-file.ts`, which strips the
 * `id`/`modelId` fields back out for the nested file shape.
 */
import { z } from 'zod';
import { CatalogueSlugSchema } from '../common/slug';

export const GenerationSchema = z.object({
  id: CatalogueSlugSchema, // e.g. "bmw-m4-g82"
  modelId: CatalogueSlugSchema,
  code: z.string().min(1), // "G82"
  productionStartYear: z.number().int().positive(),
  productionEndYear: z.number().int().positive().optional(),
  aliases: z.array(z.string().min(1)).default([]),
});

export type Generation = z.infer<typeof GenerationSchema>;
