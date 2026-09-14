/**
 * plans/08-catalogue-data-model-json-schema.md §3/§5/§10 — the generic
 * alias table. `entityId` deliberately isn't typed per-`entityType`
 * (e.g. as `CatalogueSlugSchema` for `GENERATION`/`DERIVATIVE` but a plain
 * string for `ENGINE_FAMILY`, which has no table of its own — just the
 * `engineFamily` string on `Derivative`) so one shared query shape covers
 * every entity type uniformly, per §3's rationale for this table existing
 * at all.
 */
import { z } from 'zod';
import { CatalogueEntityTypeSchema } from '../enums/catalogue-entity-type';

export const CatalogueAliasSchema = z.object({
  id: z.string().min(1),
  entityType: CatalogueEntityTypeSchema,
  entityId: z.string().min(1),
  alias: z.string().min(1),
});

export type CatalogueAlias = z.infer<typeof CatalogueAliasSchema>;
