import { describe, expect, it } from 'vitest';
import { validateCatalogueFile } from './validator';

const validFile = {
  make: 'BMW',
  model: 'M4',
  generations: [
    {
      code: 'G82',
      productionStartYear: 2021,
      derivatives: [
        {
          name: 'M4 Competition xDrive',
          bodyStyle: 'COUPE',
          fuel: 'PETROL',
          drivetrain: 'AWD',
        },
      ],
    },
  ],
};

describe('validateCatalogueFile', () => {
  it('reports every entity as ok for a valid file', () => {
    const report = validateCatalogueFile('catalogue/bmw/m4.json', validFile);
    expect(report.ok).toBe(true);
    expect(report.results.map((r) => `${r.entityType}:${r.label}:${r.ok}`)).toEqual([
      'MAKE:BMW:true',
      'MODEL:M4:true',
      'GENERATION:G82:true',
      'DERIVATIVE:M4 Competition xDrive (G82):true',
    ]);
  });

  it('fails the whole file when the top-level shape is wrong', () => {
    const report = validateCatalogueFile('bad.json', { make: 'BMW' });
    expect(report.ok).toBe(false);
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.entityType).toBe('MODEL');
  });

  it('pinpoints one bad derivative without failing the sibling derivative', () => {
    const file = {
      make: 'BMW',
      model: 'M4',
      generations: [
        {
          code: 'G82',
          productionStartYear: 2021,
          derivatives: [
            { name: 'Good', bodyStyle: 'COUPE', fuel: 'PETROL', drivetrain: 'AWD' },
            { name: 'Bad', bodyStyle: 'COUPE', fuel: 'PETROL_DIESEL', drivetrain: 'AWD' },
          ],
        },
      ],
    };
    const report = validateCatalogueFile('catalogue/bmw/m4.json', file);
    expect(report.ok).toBe(false);

    const good = report.results.find((r) => r.label === 'Good (G82)');
    const bad = report.results.find((r) => r.label === 'Bad (G82)');
    expect(good?.ok).toBe(true);
    expect(bad?.ok).toBe(false);
    expect(bad?.errors.length).toBeGreaterThan(0);
  });

  it('fails a generation with no code, still reports the make/model as ok', () => {
    const file = {
      make: 'BMW',
      model: 'M4',
      generations: [{ productionStartYear: 2021, derivatives: [] }],
    };
    const report = validateCatalogueFile('catalogue/bmw/m4.json', file);
    expect(report.ok).toBe(false);
    expect(report.results.find((r) => r.entityType === 'MAKE')?.ok).toBe(true);
    expect(report.results.find((r) => r.entityType === 'GENERATION')?.ok).toBe(false);
  });
});
