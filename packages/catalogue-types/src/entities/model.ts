/** plans/08-catalogue-data-model-json-schema.md §5/§6 — mirrors the `Model` Prisma model. */
import { z } from 'zod';
import { CatalogueSlugSchema } from '../common/slug';

export const ModelSchema = z.object({
  id: CatalogueSlugSchema, // e.g. "bmw-m4"
  makeId: CatalogueSlugSchema,
  name: z.string().min(1),
});

export type Model = z.infer<typeof ModelSchema>;
