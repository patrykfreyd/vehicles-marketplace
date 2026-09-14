import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CatalogueModelFileSchema } from './catalogue-model-file';

// The idea doc's own §24 worked example (BMW M4, F82 + G82), camelCase per
// Plan 03 §4 — plans/08-catalogue-data-model-json-schema.md §7/§10's
// required fixture: it must validate end-to-end with zero schema errors.
const FIXTURE_PATH = join(__dirname, '..', '..', '..', '..', 'catalogue', 'bmw', 'm4.json');

describe('CatalogueModelFileSchema — BMW M4 worked example (idea doc §24)', () => {
  it('validates the whole file with zero schema errors', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    const result = CatalogueModelFileSchema.safeParse(raw);
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it('carries both the F82 and G82 generations, each with their derivatives', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    const parsed = CatalogueModelFileSchema.parse(raw);

    expect(parsed.make).toBe('BMW');
    expect(parsed.model).toBe('M4');
    expect(parsed.generations).toHaveLength(2);

    const f82 = parsed.generations.find((g) => g.code === 'F82');
    const g82 = parsed.generations.find((g) => g.code === 'G82');
    if (!f82 || !g82) throw new Error('expected both F82 and G82 generations');

    expect(f82.derivatives.map((d) => d.name)).toEqual(['M4', 'M4 Competition']);
    // The F82 "M4 Competition" derivative omits transmissions entirely in
    // the idea doc's own example — proves the schema tolerates that
    // (defaults to `[]`) rather than rejecting it.
    const f82Competition = f82.derivatives.find((d) => d.name === 'M4 Competition');
    expect(f82Competition?.transmissions).toEqual([]);

    expect(g82.productionEndYear).toBeUndefined();
    expect(g82.derivatives).toHaveLength(1);
    expect(g82.derivatives[0]?.name).toBe('M4 Competition xDrive');
    expect(g82.derivatives[0]?.drivetrain).toBe('AWD');
  });

  it('rejects a file missing a required field', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    delete raw.generations[0].derivatives[0].drivetrain;
    expect(CatalogueModelFileSchema.safeParse(raw).success).toBe(false);
  });
});
