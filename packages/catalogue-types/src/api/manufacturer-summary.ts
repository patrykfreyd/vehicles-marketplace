/**
 * plans/09-catalogue-import-tooling-admin.md §7 — one row of the Catalogue
 * Admin's manufacturer list: completeness % per manufacturer, sortable by
 * the priority formula from §2 (idea doc §34).
 *
 * `priorityScore` is deliberately just `100 - averageCompleteness` for now
 * — the idea doc's full formula is "UK prevalence × marketplace demand ×
 * incompleteness", but no prevalence/demand dataset exists yet (§3 defers
 * bulk external data). Incompleteness is the one factor this plan can
 * actually compute, so it's the whole score today; the field is separate
 * from `averageCompleteness` (not just its inverse read off the same
 * number by the caller) so a later plan can fold in real prevalence/demand
 * multipliers without an API shape change.
 */
import { z } from 'zod';

export const ManufacturerSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modelCount: z.number().int().min(0),
  derivativeCount: z.number().int().min(0),
  averageCompleteness: z.number().int().min(0).max(100),
  priorityScore: z.number().int().min(0).max(100),
});

export type ManufacturerSummary = z.infer<typeof ManufacturerSummarySchema>;

export const ManufacturerListQuerySchema = z.object({
  sort: z.enum(['priority', 'completeness', 'name']).default('priority'),
});

export type ManufacturerListQuery = z.infer<typeof ManufacturerListQuerySchema>;
