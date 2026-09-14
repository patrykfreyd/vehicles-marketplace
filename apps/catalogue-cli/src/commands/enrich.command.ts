/**
 * `catalogue enrich <manufacturer> <model>` — plans/09-catalogue-import-tooling-admin.md
 * §5: calls the `AiClient` wrapper to draft candidate derivatives from a
 * source description, validates the AI output against the exact same Zod
 * schema a human-authored file goes through, writes the draft to
 * `catalogue/<manufacturer>/` with `status: AI_DRAFT`, and does **not**
 * import it — a human reviews the file, then runs
 * `catalogue import <manufacturer> --file <path>` (§6).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CatalogueModelFileSchema,
  DerivativeStagingSchema,
  type DerivativeStaging,
} from '@vehicles-marketplace/catalogue-types';
import { loadEnv } from '@vehicles-marketplace/config';
import type { AiClient } from '../lib/ai-client';
import { manufacturerDir, readCatalogueFile, writeCatalogueFile } from '../lib/catalogue-files';
import { OpenAiClient } from '../lib/openai-client';
import { slugifyPart } from '../lib/slugs';

function titleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function buildDefaultAiClient(): AiClient {
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not set — see .env.example\'s "AI (Plan 09)" section for how to add one.',
    );
  }
  return new OpenAiClient({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL });
}

export interface RunEnrichOptions {
  generationCode: string;
  productionStartYear?: number;
  productionEndYear?: number;
  source: string;
  count?: number;
  /** Injectable for tests — production callers omit this and get `OpenAiClient`. */
  aiClient?: AiClient;
  /** Injectable for tests — defaults to `process.cwd()`. */
  cwd?: string;
}

export interface RunEnrichResult {
  outputPath: string;
  accepted: DerivativeStaging[];
  rejected: Array<{ index: number; errors: string[] }>;
}

interface ExistingGenerationContext {
  productionStartYear: number;
  productionEndYear?: number;
  aliases: string[];
}

// Fields the AI may never set — the importer/Admin own these, not a draft.
const FORBIDDEN_AI_FIELDS = ['status', 'confidence', 'reviewed', 'completenessScore'] as const;

export async function runEnrich(
  manufacturer: string,
  model: string,
  options: RunEnrichOptions,
): Promise<RunEnrichResult> {
  const client = options.aiClient ?? buildDefaultAiClient();
  const fileSlug = slugifyPart(model);
  const dir = manufacturerDir(manufacturer, options.cwd);
  const canonicalPath = join(dir, `${fileSlug}.json`);
  const draftPath = join(dir, `${fileSlug}.ai-draft.json`);

  let makeName = titleCaseFromSlug(manufacturer);
  let modelName = model;
  let generationContext: ExistingGenerationContext | undefined;

  if (existsSync(canonicalPath)) {
    const { raw } = readCatalogueFile(canonicalPath);
    const parsed = CatalogueModelFileSchema.safeParse(raw);
    if (parsed.success) {
      makeName = parsed.data.make;
      modelName = parsed.data.model;
      const existingGeneration = parsed.data.generations.find(
        (generation) => generation.code === options.generationCode,
      );
      if (existingGeneration) {
        generationContext = {
          productionStartYear: existingGeneration.productionStartYear,
          productionEndYear: existingGeneration.productionEndYear,
          aliases: existingGeneration.aliases,
        };
      }
    }
  }

  if (!generationContext) {
    if (options.productionStartYear === undefined) {
      throw new Error(
        `Generation "${options.generationCode}" was not found in an existing ${canonicalPath} — pass --production-start-year to draft it as a new generation.`,
      );
    }
    generationContext = {
      productionStartYear: options.productionStartYear,
      productionEndYear: options.productionEndYear,
      aliases: [],
    };
  }

  const rawCandidates = await client.draftDerivatives({
    make: makeName,
    model: modelName,
    generationCode: options.generationCode,
    sourceDescription: options.source,
    count: options.count ?? 1,
  });

  const accepted: DerivativeStaging[] = [];
  const rejected: Array<{ index: number; errors: string[] }> = [];

  rawCandidates.forEach((candidate, index) => {
    const sanitized =
      typeof candidate === 'object' && candidate !== null
        ? Object.fromEntries(
            Object.entries(candidate as Record<string, unknown>).filter(
              ([key]) => !FORBIDDEN_AI_FIELDS.includes(key as (typeof FORBIDDEN_AI_FIELDS)[number]),
            ),
          )
        : candidate;

    const result = DerivativeStagingSchema.safeParse(sanitized);
    if (result.success) {
      accepted.push(result.data);
    } else {
      rejected.push({
        index,
        errors: result.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      });
    }
  });

  console.log(
    `catalogue enrich ${manufacturer} ${model} [${options.generationCode}]: ${accepted.length} candidate(s) accepted, ${rejected.length} rejected`,
  );
  for (const failure of rejected) {
    console.log(`  ✗ candidate #${failure.index + 1}:`);
    for (const error of failure.errors) console.log(`      - ${error}`);
  }

  if (accepted.length === 0) {
    console.log('No valid candidates to write — nothing changed on disk.');
    return { outputPath: draftPath, accepted, rejected };
  }

  const draft = CatalogueModelFileSchema.parse({
    make: makeName,
    model: modelName,
    generations: [
      {
        code: options.generationCode,
        productionStartYear: generationContext.productionStartYear,
        productionEndYear: generationContext.productionEndYear,
        aliases: generationContext.aliases,
        derivatives: accepted,
      },
    ],
  });

  writeCatalogueFile(draftPath, draft);
  console.log(`Wrote ${draftPath}`);
  console.log(`Review this draft, then run: catalogue import ${manufacturer} --file ${draftPath}`);

  return { outputPath: draftPath, accepted, rejected };
}
