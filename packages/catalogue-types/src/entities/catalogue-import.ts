/**
 * plans/09-catalogue-import-tooling-admin.md §4/§5 — mirrors
 * `CatalogueImport`, the one row `catalogue import` writes per run,
 * carrying the same summary counts printed to the CLI (§5's worked
 * example: "2 generations, 7 derivatives, ...").
 */
import { z } from 'zod';
import { CatalogueValidationIssueSchema } from './catalogue-validation-issue';

export const CatalogueImportSchema = z.object({
  id: z.string().min(1),
  manufacturerId: z.string().min(1),
  filePath: z.string().min(1),
  importedBy: z.string().min(1).optional(), // User.id, absent for CLI-only runs
  recordsCreated: z.number().int().min(0),
  recordsUpdated: z.number().int().min(0),
  warningsCount: z.number().int().min(0),
  errorsCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  issues: z.array(CatalogueValidationIssueSchema).optional(),
});

export type CatalogueImport = z.infer<typeof CatalogueImportSchema>;
