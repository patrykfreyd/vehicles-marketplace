import { z } from 'zod';
import { CreateVehicleRequestSchema } from './create-vehicle-request';

/**
 * plans/11-vehicle-listing-data-model.md §8 — `PATCH /vehicles/:id`: the
 * same seller-suppliable condition/history fields as creation, all
 * optional. `vehicleLookupId` stays out (a `Vehicle` is never re-pointed
 * at a different lookup after creation).
 */
export const UpdateVehicleRequestSchema = CreateVehicleRequestSchema.omit({
  vehicleLookupId: true,
}).partial();

export type UpdateVehicleRequest = z.infer<typeof UpdateVehicleRequestSchema>;
