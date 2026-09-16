import { z } from 'zod';
import { FuelTypeSchema } from '../enums/fuel';

/**
 * plans/10-dvla-lookup-seller-matching.md §2/§5 — the fields the real DVLA
 * Vehicle Enquiry Service actually returns (make, year, engine capacity,
 * fuel, colour, tax/MOT status — no model/trim), plus this lookup's own id
 * and a best-effort match against Plan 08's `Make` table so the seller's
 * next step (picking a Model) can be filtered without re-typing the make.
 *
 * `fuel`/`rawFuelType` are deliberately both present: `fuel` is DVLA's
 * fuelType string mapped onto our controlled `Fuel` enum for matching
 * (§3's ranking needs an exact enum match); `rawFuelType` is DVLA's own
 * text, kept for display/debugging when the mapping comes back `null`
 * (an unrecognized DVLA fuel string) so nothing is silently dropped.
 */
export const DvlaLookupResultSchema = z.object({
  id: z.string().min(1),
  registration: z.string().min(1),
  make: z.string().min(1),
  // `.min(1)` on every nullable string field below isn't just "no empty
  // strings" — it also steers nestjs-zod's Zod-4-to-OpenAPI conversion onto
  // its `anyOf: [{type}, {type: "null"}]` path. A *bare* `z.string().nullable()`
  // (no checks at all) instead emits OpenAPI 3.1's `type: ["string", "null"]`
  // shorthand, which `@nestjs/swagger`'s document builder mishandles —
  // silently turning it into `{ type: "array", items: { type: "string" } }`
  // in the generated spec, which `openapi-typescript` then (correctly, per
  // that broken spec) types as `string[]`, not `string | null`. Discovered
  // via this schema (nothing before Plan 10 had wired a bare-nullable-string
  // Zod schema through `createZodDto`/`@ZodResponse` far enough to hit it).
  matchedMakeId: z.string().min(1).nullable(),
  yearOfManufacture: z.number().int().nullable(),
  engineCapacityCc: z.number().int().positive().nullable(),
  fuel: FuelTypeSchema.nullable(),
  rawFuelType: z.string().min(1).nullable(),
  colour: z.string().min(1).nullable(),
  taxStatus: z.string().min(1).nullable(),
  motStatus: z.string().min(1).nullable(),
  motExpiryDate: z.string().min(1).nullable(),
});

export type DvlaLookupResult = z.infer<typeof DvlaLookupResultSchema>;
