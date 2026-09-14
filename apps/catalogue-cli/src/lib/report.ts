/**
 * plans/09-catalogue-import-tooling-admin.md §5 — `catalogue report
 * <manufacturer>` / `catalogue completeness`: a completeness percentage per
 * model/generation, formatted like the idea doc's §32 tree example (BMW
 * 92%, 1 Series Complete, 5 Series In Progress, ...). Pure formatting logic
 * over already-fetched rows, so the DB query (commands/*.command.ts) and
 * the tree-building/printing (here) stay independently testable.
 */

export type ModelStatus = 'Complete' | 'In Progress' | 'Warning';

export interface DerivativeSummary {
  completenessScore: number;
  hasOpenIssue: boolean;
}

export interface ModelReport {
  name: string;
  status: ModelStatus;
  averageCompleteness: number;
  derivativeCount: number;
}

export interface MakeReport {
  id: string;
  name: string;
  averageCompleteness: number;
  models: ModelReport[];
}

/** "Complete" needs every derivative at 100% *and* no open issue — a fully-specced record can still have an unresolved duplicate/relationship warning. */
export function summarizeModelStatus(derivatives: DerivativeSummary[]): ModelStatus {
  if (derivatives.length === 0) return 'In Progress';
  if (derivatives.some((derivative) => derivative.hasOpenIssue)) return 'Warning';
  if (derivatives.every((derivative) => derivative.completenessScore === 100)) return 'Complete';
  return 'In Progress';
}

export function averageCompleteness(derivatives: DerivativeSummary[]): number {
  if (derivatives.length === 0) return 0;
  const total = derivatives.reduce((sum, derivative) => sum + derivative.completenessScore, 0);
  return Math.round(total / derivatives.length);
}

/** Formats one make's tree the way the idea doc's §32 example reads. */
export function formatMakeReport(report: MakeReport): string {
  const lines = [`${report.name} ${report.averageCompleteness}%`];
  for (const model of report.models) {
    lines.push(`  ${model.name}  ${model.status} (${model.averageCompleteness}%)`);
  }
  return lines.join('\n');
}

/** `catalogue completeness`: every make, worst-first (§2/§34 — prioritize by incompleteness). */
export function sortByIncompletenessDescending(reports: MakeReport[]): MakeReport[] {
  return [...reports].sort((a, b) => a.averageCompleteness - b.averageCompleteness);
}
