/**
 * plans/08-catalogue-data-model-json-schema.md §2/§4 — every AI-created or
 * imported catalogue record carries this so nothing AI-generated is
 * silently treated as trusted production data.
 */
import { z } from 'zod';

export const CatalogueStatusSchema = z.enum([
  'IMPORTED',
  'AI_DRAFT',
  'REVIEW_REQUIRED',
  'SOURCE_CONFIRMED',
  'APPROVED',
  'DEPRECATED',
]);

export type CatalogueStatus = z.infer<typeof CatalogueStatusSchema>;
