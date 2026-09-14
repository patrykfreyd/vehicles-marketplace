/**
 * plans/09-catalogue-import-tooling-admin.md §4/§7 — mirrors
 * `CatalogueSource`: a reusable pool of citable sources ("BMW UK press pack
 * 2023") an admin attaches to a derivative via `DerivativeSource`
 * (`derivative-source.ts`) — see that file's schema for why the join exists.
 */
import { z } from 'zod';

export const CatalogueSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // "BMW UK press pack 2023"
  url: z.string().url().optional(),
  licenseNote: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
});

export type CatalogueSource = z.infer<typeof CatalogueSourceSchema>;
