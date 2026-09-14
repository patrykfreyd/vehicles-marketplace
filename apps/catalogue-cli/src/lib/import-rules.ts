/**
 * plans/09-catalogue-import-tooling-admin.md §5/§6 — the pure decision
 * rules the importer applies per derivative: what `CatalogueValidationIssue`
 * rows to raise, and what `status` a freshly-imported/updated row ends up
 * with. Kept side-effect-free (no DB/fs) so it's cheaply unit-testable; the
 * DB-touching pipeline (`importer.ts`) just calls these.
 */
import {
  missingCompletenessFields,
  type CatalogueStatus,
  type CompletenessInput,
} from '@vehicles-marketplace/catalogue-types';

export interface DerivativeIssueDraft {
  severity: 'WARNING' | 'ERROR';
  message: string;
}

/** §7: "showing open CatalogueValidationIssue rows inline next to the relevant field" — one issue per missing optional field, so the Admin can point at exactly which field needs attention. */
export function buildCompletenessIssues(derivative: CompletenessInput): DerivativeIssueDraft[] {
  return missingCompletenessFields(derivative).map((field) => ({
    severity: 'WARNING',
    message: `Missing ${field}`,
  }));
}

export interface ResolveStatusInput {
  /** The raw JSON's `status` field, before Zod's `.default('AI_DRAFT')` applied — `undefined` means the author didn't set one at all (see `importer.ts`'s comment on why this distinction matters). */
  rawStatus: string | undefined;
  hasIssues: boolean;
}

export interface ResolveStatusResult {
  status: CatalogueStatus;
  /** Set when `rawStatus` was `'APPROVED'` — the CLI never grants that status (§6: "there is no CLI flag that skips this"), so this is reported back as an ERROR issue rather than silently accepted or silently dropped. */
  rejectedApproval: boolean;
}

/**
 * §6's state machine, as applied at import time:
 * - No status in the JSON at all -> a freshly imported, human-trusted
 *   record starts `IMPORTED` (distinct from `AI_DRAFT`, which specifically
 *   means "written by `catalogue enrich`, not yet reviewed" — see
 *   `enrich.command.ts`, which always sets it explicitly).
 * - An explicit status survives import as-is, *except* `APPROVED` — only
 *   the Admin UI can grant that (§6).
 * - `AI_DRAFT`/`IMPORTED` automatically move to `REVIEW_REQUIRED` when the
 *   record has any validation issue. An already-advanced human-set status
 *   (`SOURCE_CONFIRMED`, `DEPRECATED`) is left alone — §6's diagram only
 *   lists `AI_DRAFT`/`IMPORTED` as the automatic transition's source, so a
 *   completeness gap doesn't undo a human's own review.
 */
export function resolveImportStatus(input: ResolveStatusInput): ResolveStatusResult {
  if (input.rawStatus === 'APPROVED') {
    return { status: 'REVIEW_REQUIRED', rejectedApproval: true };
  }

  const initialStatus: CatalogueStatus =
    input.rawStatus === undefined ? 'IMPORTED' : (input.rawStatus as CatalogueStatus);

  if (input.hasIssues && (initialStatus === 'IMPORTED' || initialStatus === 'AI_DRAFT')) {
    return { status: 'REVIEW_REQUIRED', rejectedApproval: false };
  }

  return { status: initialStatus, rejectedApproval: false };
}
