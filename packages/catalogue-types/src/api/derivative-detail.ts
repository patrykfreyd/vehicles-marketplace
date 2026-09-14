/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the derivative detail/
 * edit screen's response shape: every Level 2 field (via `DerivativeRecordSchema`)
 * plus the make/model/generation context, open validation issues, aliases,
 * and attached sources the screen shows inline.
 */
import { z } from 'zod';
import { DerivativeRecordSchema } from '../entities/derivative';
import { CatalogueValidationIssueSchema } from '../entities/catalogue-validation-issue';
import { DerivativeSourceSchema } from '../entities/derivative-source';

/** One `CatalogueAlias` row, with its id — the Admin's remove-alias action needs the row id, not just the display string `DerivativeRecordSchema.aliases` carries. */
export const AliasRecordSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1),
});

export type AliasRecord = z.infer<typeof AliasRecordSchema>;

export const DerivativeDetailSchema = DerivativeRecordSchema.extend({
  makeId: z.string().min(1),
  makeName: z.string().min(1),
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  generationCode: z.string().min(1),
  issues: z.array(CatalogueValidationIssueSchema),
  sourceLinks: z.array(DerivativeSourceSchema),
  aliasRecords: z.array(AliasRecordSchema),
});

export type DerivativeDetail = z.infer<typeof DerivativeDetailSchema>;

/**
 * `catalogue-admin`'s edit endpoint — every Level 2 spec field the derivative
 * detail screen's `<FormField>` form can change, all optional (a `PATCH`,
 * not a full replace). Deliberately excludes `id`/`generationId` (never
 * editable), `status`/`reviewed`/`confidence` (moved only by the dedicated
 * approve/reject/merge actions, §6), `completenessScore` (server-recomputed
 * on every save, never client-supplied), and `aliases` (its own add/remove
 * endpoints, §7).
 */
export const UpdateDerivativeRequestSchema = DerivativeRecordSchema.omit({
  id: true,
  generationId: true,
  status: true,
  reviewed: true,
  confidence: true,
  completenessScore: true,
  aliases: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  // .strict(), not the default lenient object parse: a caller sending
  // "status" here should get a clear VALIDATION_ERROR pointing at the
  // approve/reject endpoints instead of that field silently being dropped.
  .strict();

export type UpdateDerivativeRequest = z.infer<typeof UpdateDerivativeRequestSchema>;

export const AddAliasRequestSchema = z.object({
  alias: z.string().min(1, 'Alias is required'),
});

export type AddAliasRequest = z.infer<typeof AddAliasRequestSchema>;

export const AddSourceRequestSchema = z.object({
  name: z.string().min(1, 'Source name is required'),
  url: z.string().url('Must be a valid URL').optional(),
  licenseNote: z.string().min(1).optional(),
});

export type AddSourceRequest = z.infer<typeof AddSourceRequestSchema>;

export const MergeDerivativesRequestSchema = z.object({
  duplicateId: z.string().min(1, 'duplicateId is required'),
});

export type MergeDerivativesRequest = z.infer<typeof MergeDerivativesRequestSchema>;
