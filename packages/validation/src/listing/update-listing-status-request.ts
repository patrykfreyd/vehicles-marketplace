import { z } from 'zod';
import { ListingStatusSchema } from '../enums/listing-status';

/** plans/11-vehicle-listing-data-model.md §7/§8 — `POST /listings/:id/status`. */
export const UpdateListingStatusRequestSchema = z.object({
  status: ListingStatusSchema,
});

export type UpdateListingStatusRequest = z.infer<typeof UpdateListingStatusRequestSchema>;
