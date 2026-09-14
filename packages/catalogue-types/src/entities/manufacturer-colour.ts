/** plans/08-catalogue-data-model-json-schema.md §5/§6 — mirrors `ManufacturerColour`. */
import { z } from 'zod';
import { CatalogueSlugSchema } from '../common/slug';
import { ColourFamilySchema } from '../enums/colour-family';

export const ManufacturerColourSchema = z.object({
  id: CatalogueSlugSchema,
  makeId: CatalogueSlugSchema,
  name: z.string().min(1), // "Marina Bay Blue Metallic"
  family: ColourFamilySchema,
  paintCode: z.string().min(1).optional(), // "C1K"
  aliases: z.array(z.string().min(1)).default([]),
});

export type ManufacturerColour = z.infer<typeof ManufacturerColourSchema>;
