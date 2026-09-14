/**
 * Catalogue-specific Zod schemas (Plan 08) — the Make -> Model ->
 * Generation -> Derivative hierarchy, its controlled enums, and the
 * completeness-score formula, plus the nested JSON staging shape sellers/
 * AI/importers author against. `catalogue.schema.json`
 * (`pnpm catalogue:generate-json-schema`, see `scripts/generate-json-schema.ts`)
 * is generated from these, not hand-maintained separately — see
 * plans/08-catalogue-data-model-json-schema.md §3/§6.
 */
export * from './common/slug';

export * from './enums/aspiration';
export * from './enums/catalogue-entity-type';
export * from './enums/catalogue-status';
export * from './enums/colour-family';
export * from './enums/engine-configuration';
export * from './enums/issue-severity';

export * from './entities/catalogue-alias';
export * from './entities/catalogue-import';
export * from './entities/catalogue-source';
export * from './entities/catalogue-validation-issue';
export * from './entities/derivative';
export * from './entities/derivative-source';
export * from './entities/equipment';
export * from './entities/generation';
export * from './entities/make';
export * from './entities/manufacturer-colour';
export * from './entities/manufacturer-equipment-alias';
export * from './entities/model';

export * from './staging/catalogue-model-file';

export * from './api/derivative-detail';
export * from './api/duplicate-group';
export * from './api/manufacturer-detail';
export * from './api/manufacturer-summary';
export * from './api/published-derivative';

export * from './completeness';
export * from './duplicates';
