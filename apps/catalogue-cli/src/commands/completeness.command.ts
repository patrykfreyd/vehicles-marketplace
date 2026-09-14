/** `catalogue completeness` — plans/09-catalogue-import-tooling-admin.md §5: the report command across every imported manufacturer, for prioritization (§2/§34). */
import { getAllMakeReports } from '../lib/catalogue-queries';
import { formatMakeReport, sortByIncompletenessDescending } from '../lib/report';

export async function runCompleteness(): Promise<void> {
  const reports = await getAllMakeReports();
  if (reports.length === 0) {
    console.log('No manufacturers imported yet.');
    return;
  }
  for (const report of sortByIncompletenessDescending(reports)) {
    console.log(formatMakeReport(report));
    console.log('');
  }
}
