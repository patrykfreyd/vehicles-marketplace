/** `catalogue validate <file>` — plans/09-catalogue-import-tooling-admin.md §5. No DB writes. */
import { readCatalogueFile, resolveCataloguePath } from '../lib/catalogue-files';
import { validateCatalogueFile, type ValidateFileReport } from '../lib/validator';

export function printValidateReport(report: ValidateFileReport): void {
  console.log(`Validating ${report.filePath}`);
  for (const result of report.results) {
    const mark = result.ok ? '✓' : '✗';
    console.log(`  ${mark} [${result.entityType}] ${result.label}`);
    for (const error of result.errors) {
      console.log(`      - ${error}`);
    }
  }
  console.log(report.ok ? 'PASS' : 'FAIL');
}

export async function runValidate(filePath: string): Promise<ValidateFileReport> {
  const { raw } = readCatalogueFile(resolveCataloguePath(filePath));
  const report = validateCatalogueFile(filePath, raw);
  printValidateReport(report);
  return report;
}
