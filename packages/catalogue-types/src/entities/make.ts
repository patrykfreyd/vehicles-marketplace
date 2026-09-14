/** plans/08-catalogue-data-model-json-schema.md §5/§6 — mirrors the `Make` Prisma model. */
import { z } from 'zod';
import { CatalogueSlugSchema } from '../common/slug';

export const MakeSchema = z.object({
  id: CatalogueSlugSchema, // e.g. "bmw"
  name: z.string().min(1),
});

export type Make = z.infer<typeof MakeSchema>;
