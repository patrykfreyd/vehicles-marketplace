/** `catalogue report <manufacturer>` — plans/09-catalogue-import-tooling-admin.md §5. */
import { getMakeReport } from '../lib/catalogue-queries';
import { formatMakeReport } from '../lib/report';

export async function runReport(manufacturer: string): Promise<void> {
  const report = await getMakeReport(manufacturer);
  if (!report) {
    console.log(
      `No manufacturer "${manufacturer}" found — run "catalogue import ${manufacturer}" first.`,
    );
    return;
  }
  console.log(formatMakeReport(report));
}
