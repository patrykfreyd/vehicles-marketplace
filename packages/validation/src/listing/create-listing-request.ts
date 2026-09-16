import { z } from 'zod';
import { MoneyPenceSchema } from '../common/money';

/**
 * plans/11-vehicle-listing-data-model.md §8/§10 — `POST /listings`: created
 * against a `vehicleId` the caller owns (checked in the service, §10's
 * second acceptance criterion — a non-owned vehicle is a 403, not a 400).
 */
export const CreateListingRequestSchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId is required'),
  pricePence: MoneyPenceSchema,
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  locationPostcodeArea: z.string().min(1).optional(),
  locationCountry: z.string().min(1).default('GB'),
});

export type CreateListingRequest = z.infer<typeof CreateListingRequestSchema>;
