import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  catalogueRoot,
  findRepoRoot,
  isDraftFile,
  listModelFiles,
  manufacturerDir,
  readCatalogueFile,
  resolveCataloguePath,
  writeCatalogueFile,
} from './catalogue-files';

describe('isDraftFile', () => {
  it('recognizes the .ai-draft.json suffix', () => {
    expect(isDraftFile('m4.ai-draft.json')).toBe(true);
    expect(isDraftFile('m4.json')).toBe(false);
  });
});

describe('listModelFiles / readCatalogueFile / writeCatalogueFile', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'catalogue-cli-test-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('returns an empty array for a manufacturer with no directory yet', () => {
    expect(listModelFiles('bmw', cwd)).toEqual([]);
  });

  it('lists real model files, excludes AI drafts, and reads/writes JSON round-trip', () => {
    const dir = manufacturerDir('bmw', cwd);
    writeCatalogueFile(join(dir, 'm4.json'), { make: 'BMW', model: 'M4', generations: [] });
    writeFileSync(join(dir, 'm4.ai-draft.json'), '{}');
    writeFileSync(join(dir, 'notes.txt'), 'ignore me');

    const files = listModelFiles('bmw', cwd);
    expect(files).toEqual([join(dir, 'm4.json')]);

    const { raw } = readCatalogueFile(files[0]!);
    expect(raw).toEqual({ make: 'BMW', model: 'M4', generations: [] });
  });
});

describe('findRepoRoot / catalogueRoot / resolveCataloguePath', () => {
  it('falls back to the given directory when no pnpm-workspace.yaml is found (a synthetic temp dir)', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'catalogue-cli-root-test-'));
    try {
      expect(findRepoRoot(cwd)).toBe(cwd);
      expect(catalogueRoot(cwd)).toBe(join(cwd, 'catalogue'));
      expect(resolveCataloguePath('catalogue/bmw/m4.json', cwd)).toBe(
        join(cwd, 'catalogue', 'bmw', 'm4.json'),
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('finds the real repo root from a subdirectory nested under it (this file’s own directory)', () => {
    const root = findRepoRoot(import.meta.dirname);
    expect(existsSync(join(root, 'pnpm-workspace.yaml'))).toBe(true);
    expect(catalogueRoot(import.meta.dirname)).toBe(join(root, 'catalogue'));
  });

  it('passes an already-absolute path through resolveCataloguePath unchanged', () => {
    const absolute = join(tmpdir(), 'already-absolute.json');
    expect(resolveCataloguePath(absolute, import.meta.dirname)).toBe(absolute);
  });
});
