/**
 * plans/09-catalogue-import-tooling-admin.md §4/§7 — mirrors
 * `CatalogueValidationIssue`, one warning/error raised by `catalogue
 * import` and shown in the Admin next to the field it concerns
 * (`entityType`/`entityId` reuse the same generic-association shape as
 * `CatalogueAlias`, per that file's own comment on why).
 */
import { z } from 'zod';
import { CatalogueEntityTypeSchema } from '../enums/catalogue-entity-type';
import { IssueSeveritySchema } from '../enums/issue-severity';

export const CatalogueValidationIssueSchema = z.object({
  id: z.string().min(1),
  importId: z.string().min(1),
  entityType: CatalogueEntityTypeSchema,
  entityId: z.string().min(1),
  severity: IssueSeveritySchema,
  message: z.string().min(1), // "G82 M4 CS missing torque"
  resolved: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type CatalogueValidationIssue = z.infer<typeof CatalogueValidationIssueSchema>;
