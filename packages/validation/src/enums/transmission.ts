/**
 * Pulled forward from the catalogue doc because it's referenced by multiple
 * future plans (search filters, catalogue, comparison) before Plan 08
 * formally owns the rest of the catalogue schema. See
 * plans/03-shared-types-validation.md §7.
 */
import { z } from 'zod';

export const TransmissionSchema = z.enum(['MANUAL', 'AUTOMATIC', 'DCT', 'CVT']);

export type Transmission = z.infer<typeof TransmissionSchema>;
