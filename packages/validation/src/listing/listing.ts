import { z } from 'zod';
import { MoneyPenceSchema } from '../common/money';
import { ListingStatusSchema } from '../enums/listing-status';
import { VehicleSchema } from '../vehicle/vehicle';

/**
 * plans/11-vehicle-listing-data-model.md §6/§8 — the full listing record,
 * embedding its `Vehicle` (§3's registration-masking rule is applied by the
 * service to `vehicle.registration` before this is returned, not encoded
 * here) and its price history (functions doc §14's "02 Sep — Listed
 * £26,495 / 07 Sep — £25,995 ↓£500 / ..." — the delta itself is a display
 * concern, computed client-side from consecutive entries).
 */
export const ListingPriceHistoryEntrySchema = z.object({
  id: z.string().min(1),
  pricePence: MoneyPenceSchema,
  changedAt: z.string().min(1),
});

export type ListingPriceHistoryEntry = z.infer<typeof ListingPriceHistoryEntrySchema>;

export const ListingSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  vehicle: VehicleSchema,
  sellerId: z.string().min(1),

  status: ListingStatusSchema,
  pricePence: MoneyPenceSchema,
  title: z.string().min(1).nullable(),
  description: z.string().min(1).nullable(),

  locationPostcodeArea: z.string().min(1).nullable(),
  locationCountry: z.string().min(1).nullable(),

  publishedAt: z.string().min(1).nullable(),
  reservedAt: z.string().min(1).nullable(),
  soldAt: z.string().min(1).nullable(),
  archivedAt: z.string().min(1).nullable(),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),

  priceHistory: z.array(ListingPriceHistoryEntrySchema),
});

export type Listing = z.infer<typeof ListingSchema>;
