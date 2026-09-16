import { z } from 'zod';
import { ModificationCategorySchema } from '../enums/modification-category';

/** plans/11-vehicle-listing-data-model.md §8 — `POST /vehicles/:id/modifications`. */
export const CreateVehicleModificationRequestSchema = z.object({
  category: ModificationCategorySchema,
  brand: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export type CreateVehicleModificationRequest = z.infer<
  typeof CreateVehicleModificationRequestSchema
>;
