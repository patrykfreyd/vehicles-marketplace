/** plans/08-catalogue-data-model-json-schema.md §5 — mirrors `ManufacturerEquipmentAlias`. */
import { z } from 'zod';
import { CatalogueSlugSchema } from '../common/slug';

export const ManufacturerEquipmentAliasSchema = z.object({
  id: z.string().min(1),
  equipmentId: z.string().min(1),
  makeId: CatalogueSlugSchema,
  manufacturerName: z.string().min(1), // "M Carbon Bucket Seats"
});

export type ManufacturerEquipmentAlias = z.infer<typeof ManufacturerEquipmentAliasSchema>;
