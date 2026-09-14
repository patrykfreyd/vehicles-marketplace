import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AiClient } from '../lib/ai-client';
import { writeCatalogueFile } from '../lib/catalogue-files';
import { runEnrich } from './enrich.command';

function fakeAiClient(derivatives: unknown[]): AiClient {
  return { draftDerivatives: async () => derivatives };
}

describe('runEnrich', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'catalogue-cli-enrich-test-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('writes a schema-valid AI_DRAFT file for a brand-new generation given --production-start-year', async () => {
    const result = await runEnrich('bmw', 'M4', {
      generationCode: 'G82',
      productionStartYear: 2021,
      source: 'press release text',
      cwd,
      aiClient: fakeAiClient([
        { name: 'M4 CS', bodyStyle: 'COUPE', fuel: 'PETROL', drivetrain: 'AWD', powerBhp: 542 },
      ]),
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);

    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.make).toBe('Bmw');
    expect(written.generations[0].code).toBe('G82');
    expect(written.generations[0].derivatives[0].name).toBe('M4 CS');
    expect(written.generations[0].derivatives[0].status).toBe('AI_DRAFT');
  });

  it('reuses an existing model file’s generation context instead of requiring --production-start-year', async () => {
    writeCatalogueFile(join(cwd, 'catalogue', 'bmw', 'm4.json'), {
      make: 'BMW',
      model: 'M4',
      generations: [
        {
          code: 'G82',
          productionStartYear: 2021,
          aliases: ['G82 M4'],
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
    });

    const result = await runEnrich('bmw', 'M4', {
      generationCode: 'G82',
      source: 'press release text',
      cwd,
      aiClient: fakeAiClient([
        { name: 'M4 CS', bodyStyle: 'COUPE', fuel: 'PETROL', drivetrain: 'AWD' },
      ]),
    });

    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.make).toBe('BMW');
    expect(written.generations[0].productionStartYear).toBe(2021);
    expect(written.generations[0].aliases).toEqual(['G82 M4']);
  });

  it('throws a clear error when the generation is unknown and no --production-start-year was given', async () => {
    await expect(
      runEnrich('bmw', 'M4', {
        generationCode: 'G99',
        source: 'text',
        cwd,
        aiClient: fakeAiClient([]),
      }),
    ).rejects.toThrow(/production-start-year/);
  });

  it('rejects an invalid AI candidate and writes nothing if none are valid', async () => {
    const result = await runEnrich('bmw', 'M4', {
      generationCode: 'G82',
      productionStartYear: 2021,
      source: 'text',
      cwd,
      aiClient: fakeAiClient([
        { name: 'Bad', bodyStyle: 'COUPE', fuel: 'PETROL_DIESEL', drivetrain: 'AWD' },
      ]),
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });

  it('strips a forbidden AI-supplied status field rather than trusting it', async () => {
    const result = await runEnrich('bmw', 'M4', {
      generationCode: 'G82',
      productionStartYear: 2021,
      source: 'text',
      cwd,
      aiClient: fakeAiClient([
        {
          name: 'M4 CS',
          bodyStyle: 'COUPE',
          fuel: 'PETROL',
          drivetrain: 'AWD',
          status: 'APPROVED',
        },
      ]),
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.status).toBe('AI_DRAFT');
  });
});
