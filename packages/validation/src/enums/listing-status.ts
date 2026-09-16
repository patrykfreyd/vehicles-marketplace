import { z } from 'zod';

/**
 * plans/11-vehicle-listing-data-model.md §4/§7 — extends Plan 06's original
 * `DRAFT/LIVE/RESERVED/SOLD/ARCHIVED` set with `PAUSED` (the seller
 * "Manage Advert" pause action). See §7 for the allowed-transition table.
 */
export const ListingStatusSchema = z.enum([
  'DRAFT',
  'LIVE',
  'PAUSED',
  'RESERVED',
  'SOLD',
  'ARCHIVED',
]);

export type ListingStatus = z.infer<typeof ListingStatusSchema>;
