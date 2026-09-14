import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PublishedDerivativeSchema } from '@vehicles-marketplace/catalogue-types';
import { PageResponseSchema } from '@vehicles-marketplace/validation';

// Plan 03's `PageRequestSchema` (`packages/validation/src/common/pagination.ts`)
// expects real numbers, fine for a JSON body but not a GET's query string
// ("page=2" arrives as the string "2") — this is the same shape with
// `z.coerce.number()` instead, kept local to this one query-string binding
// rather than changing that shared schema's contract for every future
// consumer.
export const ListPublishedDerivativesQuerySchema = z.object({
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

export class ListPublishedDerivativesQueryDto extends createZodDto(
  ListPublishedDerivativesQuerySchema,
) {}
export class PublishedDerivativePageDto extends createZodDto(
  PageResponseSchema(PublishedDerivativeSchema),
) {}
