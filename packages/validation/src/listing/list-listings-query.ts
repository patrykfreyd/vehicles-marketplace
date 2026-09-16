import { z } from 'zod';
import { ListingStatusSchema } from '../enums/listing-status';

/**
 * plans/11-vehicle-listing-data-model.md §8 —
 * `GET /listings?sellerId=me&status=...`, the seller's-own-listings query
 * Plan 20/23 consume. `page`/`pageSize` use `z.coerce.number()` rather than
 * Plan 03's `PageRequestSchema` because a query string arrives as strings
 * ("page=2"), not real numbers — same fix as
 * `apps/api/src/modules/catalogue/dto/published-derivative.dto.ts`'s own
 * `ListPublishedDerivativesQuerySchema`.
 */
export const ListListingsQuerySchema = z.object({
  sellerId: z.string().min(1).default('me'),
  status: ListingStatusSchema.optional(),
  page: z.coerce
    .number()
    .int('page must be a whole number')
    .min(1, 'page must be at least 1')
    .default(1),
  pageSize: z.coerce
    .number()
    .int('pageSize must be a whole number')
    .min(1, 'pageSize must be at least 1')
    .max(100, 'pageSize cannot exceed 100')
    .default(20),
});

export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;
