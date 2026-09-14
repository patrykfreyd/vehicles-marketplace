/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the manufacturer detail
 * screen: model list with per-model completeness and status counts
 * (Complete / In Progress / Warning), matching the idea doc's tree example.
 */
import { z } from 'zod';
import { CatalogueStatusSchema } from '../enums/catalogue-status';

/** One clickable row under a generation — what the manufacturer detail screen drills into a specific derivative from (§7: "drills into the M4 G82 derivative"). */
export const DerivativeSummaryRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: CatalogueStatusSchema,
  completenessScore: z.number().int().min(0).max(100),
  hasOpenIssue: z.boolean(),
});

export type DerivativeSummaryRow = z.infer<typeof DerivativeSummaryRowSchema>;

export const GenerationSummarySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  productionStartYear: z.number().int().positive(),
  productionEndYear: z.number().int().positive().optional(),
  derivativeCount: z.number().int().min(0),
  completeCount: z.number().int().min(0),
  inProgressCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  averageCompleteness: z.number().int().min(0).max(100),
  derivatives: z.array(DerivativeSummaryRowSchema),
});

export type GenerationSummary = z.infer<typeof GenerationSummarySchema>;

export const ModelSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generations: z.array(GenerationSummarySchema),
});

export type ModelSummary = z.infer<typeof ModelSummarySchema>;

export const ManufacturerDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  models: z.array(ModelSummarySchema),
});

export type ManufacturerDetail = z.infer<typeof ManufacturerDetailSchema>;
