#!/usr/bin/env node
/**
 * plans/09-catalogue-import-tooling-admin.md §5 — the `catalogue-cli`
 * entrypoint. Run via `pnpm catalogue <command> ...` from the repo root
 * (or `pnpm --filter @vehicles-marketplace/catalogue-cli start -- <command>
 * ...`) — see that file's `start` script for how `.env.local` gets loaded.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { db } from '@vehicles-marketplace/db';
import { runCompleteness } from './commands/completeness.command';
import { runEnrich } from './commands/enrich.command';
import { runFindDuplicates } from './commands/find-duplicates.command';
import { runImport } from './commands/import.command';
import { runReport } from './commands/report.command';
import { runValidate } from './commands/validate.command';

const program = new Command();
program
  .name('catalogue')
  .description('Catalogue import tooling — see plans/09-catalogue-import-tooling-admin.md');

program
  .command('validate <file>')
  .description(
    'Validate a catalogue/<make>/<model>.json file against the Zod schemas. No DB writes.',
  )
  .action(async (file: string) => {
    const report = await runValidate(file);
    if (!report.ok) process.exitCode = 1;
  });

program
  .command('import <manufacturer>')
  .description(
    'Validate, dedupe-check, and upsert a manufacturer’s catalogue/<manufacturer>/*.json files into Postgres.',
  )
  .option(
    '--file <path>',
    'Import exactly this file instead of the manufacturer’s default *.json files (the only way an AI-drafted .ai-draft.json file is ever imported).',
  )
  .option(
    '--imported-by <userId>',
    'Attribute this run to an admin User.id (omit for a CLI-only run).',
  )
  .action(async (manufacturer: string, options: { file?: string; importedBy?: string }) => {
    const results = await runImport(manufacturer, {
      file: options.file,
      importedBy: options.importedBy,
    });
    const hasFailure = results.some(
      (result) => !result.ok || result.issues.some((issue) => issue.severity === 'ERROR'),
    );
    if (hasFailure) process.exitCode = 1;
  });

program
  .command('report <manufacturer>')
  .description('Completeness percentage per model/generation for one manufacturer.')
  .action(async (manufacturer: string) => {
    await runReport(manufacturer);
  });

program
  .command('completeness')
  .description(
    'Completeness report across every imported manufacturer, worst-first (for prioritization).',
  )
  .action(async () => {
    await runCompleteness();
  });

program
  .command('find-duplicates <manufacturer>')
  .description(
    'Print candidate duplicate derivative pairs for a human to resolve via the Admin’s merge action. Never auto-merges.',
  )
  .action(async (manufacturer: string) => {
    await runFindDuplicates(manufacturer);
  });

program
  .command('enrich <manufacturer> <model>')
  .description(
    'AI-assisted draft generation: writes a schema-valid AI_DRAFT candidate file for a human to review. Never imports automatically.',
  )
  .requiredOption(
    '--generation <code>',
    'Generation code the drafted derivative(s) belong to, e.g. G82.',
  )
  .option(
    '--production-start-year <year>',
    'Required only if the generation isn’t already in an existing catalogue file.',
    (value: string) => Number(value),
  )
  .option(
    '--production-end-year <year>',
    'Only relevant for a brand-new generation.',
    (value: string) => Number(value),
  )
  .option(
    '--count <n>',
    'How many candidate derivatives to draft.',
    (value: string) => Number(value),
    1,
  )
  .option(
    '--source <text>',
    'Free-text source material (press release, spec sheet, notes) to draft from.',
  )
  .option('--source-file <path>', 'Read the source material from a file instead of --source.')
  .action(
    async (
      manufacturer: string,
      model: string,
      options: {
        generation: string;
        productionStartYear?: number;
        productionEndYear?: number;
        count: number;
        source?: string;
        sourceFile?: string;
      },
    ) => {
      const source = options.sourceFile
        ? readFileSync(options.sourceFile, 'utf-8')
        : options.source;
      if (!source) {
        throw new Error('One of --source or --source-file is required.');
      }
      const result = await runEnrich(manufacturer, model, {
        generationCode: options.generation,
        productionStartYear: options.productionStartYear,
        productionEndYear: options.productionEndYear,
        count: options.count,
        source,
      });
      if (result.accepted.length === 0) process.exitCode = 1;
    },
  );

async function main(): Promise<void> {
  try {
    // `pnpm --filter <pkg> start -- <args>` (the standard pnpm passthrough
    // idiom) forwards a literal "--" token ahead of <args> in this pnpm
    // version, rather than consuming it — commander would otherwise read
    // that bare "--" as "stop parsing options" before it ever reaches the
    // subcommand, breaking every named option (`--generation`, etc.).
    // Stripped here so both `pnpm catalogue <cmd> ...` (the root script)
    // and the `pnpm --filter ... start -- <cmd> ...` form behave the same.
    const argv =
      process.argv[2] === '--'
        ? [...process.argv.slice(0, 2), ...process.argv.slice(3)]
        : process.argv;
    await program.parseAsync(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

// Only run when this file is the process's actual entrypoint (`tsx
// src/cli.ts ...`) — importing it for its `program` export (cli.test.ts)
// must not parse the *importer's* argv or touch the DB as a side effect.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  void main();
}

export { program };
