/** `catalogue import <manufacturer>` — plans/09-catalogue-import-tooling-admin.md §5. */
import { listModelFiles, readCatalogueFile, resolveCataloguePath } from '../lib/catalogue-files';
import { importCatalogueFile, type ImportFileResult } from '../lib/importer';

export function printImportResult(result: ImportFileResult): void {
  if (!result.ok) {
    console.log(`✗ ${result.filePath}`);
    for (const error of result.fileErrors) console.log(`    - ${error}`);
    return;
  }

  const generationSummary = result.generations
    .map((generation) => `${generation.ok ? '✓' : '✗'} ${generation.code}`)
    .join(', ');
  const derivativeCount = result.generations.reduce((sum, g) => sum + g.derivativeCount, 0);
  const warnings = result.issues.filter((issue) => issue.severity === 'WARNING');
  const errors = result.issues.filter((issue) => issue.severity === 'ERROR');

  console.log(
    `${result.make} ${result.model} — ${result.generations.length} generations, ${derivativeCount} derivatives, ${generationSummary}` +
      (warnings.length > 0 || errors.length > 0
        ? `, warnings: ${warnings.length}, errors: ${errors.length}`
        : ''),
  );
  for (const issue of [...errors, ...warnings]) {
    console.log(
      `    [${issue.severity}] ${issue.entityType} "${issue.entityLabel}": ${issue.message}`,
    );
  }
  console.log(`  (${result.recordsCreated} created, ${result.recordsUpdated} updated)`);
}

export interface RunImportOptions {
  /** Import exactly this file, instead of the manufacturer's default `*.json` glob — the only way `catalogue enrich`'s `.ai-draft.json` output is ever imported, matching §6's "does NOT import automatically". */
  file?: string;
  importedBy?: string;
}

export async function runImport(
  manufacturer: string,
  options: RunImportOptions = {},
): Promise<ImportFileResult[]> {
  const filePaths = options.file
    ? [resolveCataloguePath(options.file)]
    : listModelFiles(manufacturer);
  if (filePaths.length === 0) {
    console.log(`No catalogue files found for manufacturer "${manufacturer}"`);
    return [];
  }

  const results: ImportFileResult[] = [];
  for (const filePath of filePaths) {
    const { raw } = readCatalogueFile(filePath);
    const result = await importCatalogueFile({
      filePath,
      raw,
      expectedMakeId: manufacturer,
      importedBy: options.importedBy,
    });
    printImportResult(result);
    results.push(result);
  }
  return results;
}
