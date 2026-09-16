import { z } from 'zod';
import { MoneyPenceSchema } from '../common/money';

/**
 * plans/11-vehicle-listing-data-model.md §6/§7/§8 — `PATCH /listings/:id`:
 * a `pricePence` change is the one field with side effects — it inserts a
 * `ListingPriceHistory` row in the same transaction (§7), and is rejected
 * once the listing is `SOLD`/`ARCHIVED` (enforced in the service, not here).
 */
export const UpdateListingRequestSchema = z.object({
  pricePence: MoneyPenceSchema.optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  locationPostcodeArea: z.string().min(1).optional(),
  locationCountry: z.string().min(1).optional(),
});

export type UpdateListingRequest = z.infer<typeof UpdateListingRequestSchema>;
