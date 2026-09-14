/**
 * plans/09-catalogue-import-tooling-admin.md §4 — severity of one
 * `CatalogueValidationIssue` row raised by the importer or surfaced in the
 * Catalogue Admin next to the relevant field.
 */
import { z } from 'zod';

export const IssueSeveritySchema = z.enum(['WARNING', 'ERROR']);

export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;
