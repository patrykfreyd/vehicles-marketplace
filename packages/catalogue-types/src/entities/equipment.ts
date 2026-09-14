/**
 * plans/08-catalogue-data-model-json-schema.md §4/§5 — mirrors `Equipment`.
 * `category` is a plain string, not an enum: the taxonomy (Seats,
 * Technology, Audio, Parking, Driver Assistance, Comfort, ...) is expected
 * to grow and doesn't gate filtering logic the way fuel/drivetrain do.
 */
import { z } from 'zod';

export const EquipmentSchema = z.object({
  id: z.string().min(1), // "carbon_bucket_seats"
  name: z.string().min(1),
  category: z.string().min(1),
});

export type Equipment = z.infer<typeof EquipmentSchema>;
