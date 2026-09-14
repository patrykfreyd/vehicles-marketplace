/**
 * Writes `catalogue/schema/catalogue.schema.json` from this package's Zod
 * schemas — plans/08-catalogue-data-model-json-schema.md §3/§6/§10: the
 * JSON Schema is *generated*, never hand-maintained, so there's exactly
 * one definition of each catalogue shape instead of two that can drift.
 *
 * Uses Zod 4's own built-in `z.toJSONSchema` (via a `z.registry()` of
 * named schemas, which is what makes `z.toJSONSchema` emit one `$defs`
 * entry per schema instead of one document per call) rather than the
 * third-party `zod-to-json-schema` package the plan names — this repo
 * already pins `zod@4.6.2`, which ships native JSON Schema conversion, so
 * there's no need for an extra dependency to do the same job.
 *
 * `io: 'input'` matters here: several fields (`aliases`, `transmissions`,
 * `status`, ...) have Zod `.default()`s, so an author is allowed to omit
 * them. The default `io: 'output'` mode would mark those fields
 * `required` in the emitted JSON Schema (since Zod's *output* always has
 * them filled in) — wrong for a schema meant to validate what a human/AI
 * actually authors before any defaulting happens.
 *
 * Run via `pnpm catalogue:generate-json-schema` from the repo root, or
 * `pnpm --filter @vehicles-marketplace/catalogue-types generate:json-schema`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { CatalogueAliasSchema } from '../src/entities/catalogue-alias';
import { DerivativeSchema } from '../src/entities/derivative';
import { EquipmentSchema } from '../src/entities/equipment';
import { GenerationSchema } from '../src/entities/generation';
import { MakeSchema } from '../src/entities/make';
import { ManufacturerColourSchema } from '../src/entities/manufacturer-colour';
import { ManufacturerEquipmentAliasSchema } from '../src/entities/manufacturer-equipment-alias';
import { ModelSchema } from '../src/entities/model';
import { CatalogueModelFileSchema } from '../src/staging/catalogue-model-file';

const registry = z.registry<{ id: string }>();
registry.add(MakeSchema, { id: 'Make' });
registry.add(ModelSchema, { id: 'Model' });
registry.add(GenerationSchema, { id: 'Generation' });
registry.add(DerivativeSchema, { id: 'Derivative' });
registry.add(ManufacturerColourSchema, { id: 'ManufacturerColour' });
registry.add(EquipmentSchema, { id: 'Equipment' });
registry.add(ManufacturerEquipmentAliasSchema, { id: 'ManufacturerEquipmentAlias' });
registry.add(CatalogueAliasSchema, { id: 'CatalogueAlias' });
// The nested authoring shape a `catalogue/<make>/<model>.json` file
// actually validates against (§7) — the entity schemas above are the
// flat, DB-row-shaped counterparts (Plan 09's importer, Plan 14's AI
// structured output).
registry.add(CatalogueModelFileSchema, { id: 'CatalogueModelFile' });

function main(): void {
  const jsonSchema = z.toJSONSchema(registry, { io: 'input' });
  const outDir = join(__dirname, '..', '..', '..', 'catalogue', 'schema');
  const outPath = join(outDir, 'catalogue.schema.json');

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(jsonSchema, null, 2)}\n`);

  console.log(`Wrote ${outPath}`);
}

main();
