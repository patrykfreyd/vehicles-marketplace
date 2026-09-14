/**
 * Filesystem access to `catalogue/<make>/<model>.json` staging files (idea
 * doc §23, plans/08-catalogue-data-model-json-schema.md §7). Every command
 * that reads catalogue JSON goes through here instead of hand-rolling
 * `fs`/`path` calls, so path conventions stay in one place.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

/**
 * `pnpm --filter @vehicles-marketplace/catalogue-cli start` (and the root
 * `pnpm catalogue` alias, which runs the same way) sets the process's cwd
 * to `apps/catalogue-cli`, not the repo root, even though every documented
 * CLI usage in §5 writes bare paths like `catalogue/bmw/m4.json` as if run
 * from the root. This walks up from `startDir` looking for
 * `pnpm-workspace.yaml` (the repo root's own marker) so `catalogue/` always
 * resolves correctly regardless of which directory actually invoked the
 * command. Falls back to `startDir` itself when no marker is found — the
 * case a test's synthetic temp directory hits deliberately.
 */
export function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

/** The `catalogue/` directory at the repo root — see `findRepoRoot`'s comment on why this isn't simply `cwd`. */
export function catalogueRoot(cwd: string = process.cwd()): string {
  return join(findRepoRoot(cwd), 'catalogue');
}

/** Resolves a user-supplied path (e.g. `catalogue validate <file>`'s argument) against the repo root, same as `catalogueRoot` — an absolute path passes through unchanged. */
export function resolveCataloguePath(path: string, cwd: string = process.cwd()): string {
  return isAbsolute(path) ? path : join(findRepoRoot(cwd), path);
}

export function manufacturerDir(manufacturer: string, cwd: string = process.cwd()): string {
  return join(catalogueRoot(cwd), manufacturer);
}

/** A draft written by `catalogue enrich` — deliberately excluded from `import <manufacturer>`'s default glob (§6: never imported without a human reviewing it first). */
export function isDraftFile(fileName: string): boolean {
  return fileName.endsWith('.ai-draft.json');
}

/** Every real (non-draft) `*.json` model file under a manufacturer's directory. Empty array (not a throw) when the directory doesn't exist — an empty manufacturer is a valid, if unhelpful, state to report on. */
export function listModelFiles(manufacturer: string, cwd: string = process.cwd()): string[] {
  const dir = manufacturerDir(manufacturer, cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !isDraftFile(name))
    .sort()
    .map((name) => join(dir, name));
}

export interface RawCatalogueFile {
  path: string;
  /** Parsed but not yet Zod-validated — callers decide how to report a parse/validation failure. */
  raw: unknown;
}

export function readCatalogueFile(path: string): RawCatalogueFile {
  const contents = readFileSync(path, 'utf-8');
  return { path, raw: JSON.parse(contents) as unknown };
}

export function writeCatalogueFile(path: string, data: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
