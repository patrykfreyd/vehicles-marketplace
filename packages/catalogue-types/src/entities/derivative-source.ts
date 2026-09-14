/**
 * plans/09-catalogue-import-tooling-admin.md §4/§7 — mirrors
 * `DerivativeSource`, the join table between a `Derivative` and the
 * `CatalogueSource` pool (added beyond §4's own literal Prisma snippet —
 * see `catalogue.prisma`'s comment on `DerivativeSource` for why: §4's
 * `CatalogueSource` alone has no way to attach to a derivative, but §6/§7
 * both require exactly that). `source` is included when the API expands
 * the relation (derivative detail/edit screens), omitted for a bare list.
 */
import { z } from 'zod';
import { CatalogueSourceSchema } from './catalogue-source';

export const DerivativeSourceSchema = z.object({
  id: z.string().min(1),
  derivativeId: z.string().min(1),
  sourceId: z.string().min(1),
  createdAt: z.string().datetime(),
  source: CatalogueSourceSchema.optional(),
});

export type DerivativeSource = z.infer<typeof DerivativeSourceSchema>;
