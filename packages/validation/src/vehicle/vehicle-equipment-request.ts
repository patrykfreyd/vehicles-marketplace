import { z } from 'zod';
import { EquipmentSourceSchema } from '../enums/equipment-source';

/** plans/11-vehicle-listing-data-model.md §8 — `POST /vehicles/:id/equipment`. */
export const AddVehicleEquipmentRequestSchema = z.object({
  equipmentId: z.string().min(1, 'equipmentId is required'),
  source: EquipmentSourceSchema.default('SELLER_DECLARED'),
});

export type AddVehicleEquipmentRequest = z.infer<typeof AddVehicleEquipmentRequestSchema>;
