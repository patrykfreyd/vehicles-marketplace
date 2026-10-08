import { z } from 'zod';
import { MoneyPenceSchema } from '../common/money';
import { UkPostcodeSchema } from './postcode';

/**
 * plans/11-vehicle-listing-data-model.md §8/§10 — `POST /listings`: created
 * against a `vehicleId` the caller owns (checked in the service, §10's
 * second acceptance criterion — a non-owned vehicle is a 403, not a 400).
 *
 * `postcode` is new in plans/13-search-filtering.md §3/§4 — the seller's
 * full postcode, optional (a listing can still be created without
 * location/distance search support, same as before this plan), geocoded by
 * the service into `latitude`/`longitude` and a derived
 * `locationPostcodeArea` when supplied. `locationPostcodeArea` itself stays
 * accepted directly too, for a caller that wants to set a display area
 * without opting into geocoding — the service only derives/overwrites it
 * when a `postcode` is actually given.
 */
export const CreateListingRequestSchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId is required'),
  pricePence: MoneyPenceSchema,
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  postcode: UkPostcodeSchema.optional(),
  locationPostcodeArea: z.string().min(1).optional(),
  locationCountry: z.string().min(1).default('GB'),
});

export type CreateListingRequest = z.infer<typeof CreateListingRequestSchema>;
