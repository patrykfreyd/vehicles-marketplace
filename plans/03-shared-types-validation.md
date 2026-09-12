# Plan 03 — Shared Types & Validation Package

Status: Draft
Depends on: Plan 01 (`packages/types`, `packages/validation` exist as empty
shells with one example export already proven to work cross-package)
Blocks: almost everything — Plan 04 (form validation UX renders these
schemas' errors), Plan 05 (API request/response validation), Plan 06
(entity ID strategy informs the Prisma schema), Plan 07/08/11/27 (each adds
its own domain schemas *on top of* the conventions fixed here)

## 1. Objective

Fix the **conventions and shared primitives** that every domain schema in
every later plan must follow, and implement the handful of types/schemas
that are genuinely cross-cutting rather than owned by one feature. This
plan is deliberately thin on content and thick on rules — most actual
domain schemas (vehicle, listing, catalogue, auth, analytics events) belong
to their owning plans and just have to comply with what's decided here.

Why this needs its own plan rather than being folded into each feature
plan: the idea docs already show the cost of not deciding this once —
`marketplace_analytics_user_engagement_tracking.md` explicitly warns against
`carViewed` / `vehicle_view` / `view-car` / `listingOpened` all meaning the
same thing. That's a naming-drift problem, and it happens at the type/schema
layer, not the analytics layer specifically. Deciding the convention once,
here, prevents it everywhere.

## 2. Division of responsibility: `validation` vs `types`

- **`packages/validation`** — Zod schemas. This is the runtime source of
  truth: every API boundary (request body, response, form input, AI
  output, background job payload, config) validates against a schema that
  lives here, per the stack doc's validation section.
- **`packages/types`** — plain TypeScript types. Re-exports `z.infer<>`
  types from `validation` (so UI code can import a type without pulling in
  `zod` as a dependency) plus types that have no runtime-validation need
  (generic API envelopes, branded ID types, utility types).

Rule: **a schema is always written once, in `validation`; its type is
always derived with `z.infer`, never hand-duplicated in `types`.**

## 3. Naming & convention decisions (apply repo-wide, not just here)

| Area | Convention | Source |
|---|---|---|
| Enum/controlled values | `UPPER_SNAKE_CASE` (`AWD`, `PETROL`, `LISTING_VIEW`) | Matches both the catalogue doc's controlled values and the analytics doc's event names — one rule, not two |
| TS/JSON field names | `camelCase` (`powerBhp`, `engineCapacityCc`) | Idiomatic for TS/JSON APIs; see §4 for how this maps to the catalogue JSON staging files, which use `snake_case` |
| Units in field names | Always suffix the unit (`powerBhp`, `torqueNm`, `engineCapacityCc`, `zeroToSixtyTwoSeconds`) | Carried directly from the catalogue doc's examples — never a bare ambiguous `power` |
| Money | Integer **minor units** (pence), never a float; field name suffixed `Pence` (`pricePence`) | Avoids float rounding bugs in price comparisons/filters |
| Timestamps | ISO 8601 UTC strings over the wire, `Date` internally | Standard, unambiguous across web/mobile/API |

## 4. Decision needed: JSON staging vs TypeScript field casing

The catalogue doc's example JSON files use `snake_case`
(`engine_capacity_cc`, `power_bhp`). This plan's default position:

- **Catalogue JSON staging files** (authored/edited by humans and AI per
  Plan 08/09) **keep `snake_case`** — it's a separate, human/AI-editable
  staging format, not a TypeScript API surface, and matching the idea doc's
  existing examples avoids a needless rewrite of that spec.
- **Everything downstream of the catalogue importer** — the Postgres
  schema (via Prisma, which itself maps to `snake_case` columns but exposes
  `camelCase` in the generated client), the API, and all Zod
  schemas/TS types — uses `camelCase`.
- The catalogue importer (Plan 09) is therefore also the place that maps
  `snake_case` JSON → `camelCase` domain objects. This plan defines the
  target shape it must map *into*; Plan 09 owns the mapping code.

Flag: if you'd rather keep `snake_case` end-to-end (including the API and
Zod schemas) to avoid *any* field-name translation step, say so now —
it's a bigger repo-wide convention than it looks and much cheaper to
change before Plan 06/08 write real schemas against it.

## 5. Entity ID strategy

The idea docs show two different ID shapes in their examples:

```text
der_bmw_m4_g82_comp_xdrive        ← catalogue: human-readable stable slug
veh_01HZX82K7Q4M                  ← vehicle/listing: prefixed opaque ID
lst_01HZYC421Q
```

This plan adopts both, deliberately, for different entity classes:

- **Catalogue entities** (make, model, generation, derivative, engine,
  colour, equipment) use **stable, human-readable slug IDs**
  (`bmw`, `bmw-m4`, `bmw-m4-g82`, `bmw-m4-g82-competition-xdrive`), because
  they're curated, low-volume, and the slug itself is useful in URLs and
  logs (per the catalogue doc's §29 "Permanent Internal IDs"). Owned in
  full by Plan 08.
- **Transactional entities** (user, vehicle, listing, message,
  conversation, analytics event, etc.) use **prefixed ULIDs**
  (`usr_01HZ...`, `veh_01HZ...`, `lst_01HZ...`) — sortable by creation
  time, collision-free without a DB round trip, and the prefix makes IDs
  self-describing in logs/errors. Generation helper lives in
  `packages/utils`.

To stop ID types being accidentally interchangeable (passing a
`derivativeId` where a `vehicleId` is expected compiles fine with plain
strings), `packages/types` defines a small branded-ID helper:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

export type VehicleId = Brand<string, "VehicleId">;
export type ListingId = Brand<string, "ListingId">;
export type DerivativeId = Brand<string, "DerivativeId">;
// ...one per entity, added by the plan that owns that entity
```

Each owning plan adds its own branded ID type here when it introduces the
entity — this plan just establishes the pattern and creates the helper.

## 6. The shared API error/validation contract

This is the most load-bearing thing in this plan: it's the shape that
connects your two front-end requirements (inline field errors, and toasts)
to one consistent backend contract, so Plan 04 and Plan 05 aren't guessing
at each other's format.

```ts
// packages/validation/src/common/errors.ts
export const ApiErrorSchema = z.object({
  code: z.string(),                          // e.g. "VALIDATION_ERROR", "NOT_FOUND"
  message: z.string(),                       // human-readable, toast-safe summary
  fieldErrors: z
    .record(z.string(), z.array(z.string()))
    .optional(),                              // present only for VALIDATION_ERROR
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
```

Contract:

- Every NestJS exception filter (Plan 05) serializes errors into this
  shape. Zod's own `.flatten().fieldErrors` maps directly onto
  `fieldErrors`, so request-body validation failures need no manual
  reshaping.
- The web/mobile form layer (Plan 04) reads `fieldErrors[fieldName]` and
  renders it directly below the relevant input — this is the field half of
  your "errors show below the input" requirement, for server-side/
  cross-field validation that can't be caught purely client-side (e.g.
  uniqueness checks). Pure client-side, as-you-type validation (format,
  required, min/max) runs the *same* Zod schema locally and never has to
  round-trip to the server at all.
- `message` (and any error with no `fieldErrors`) is what Plan 04's toast
  system renders — so a network failure, a 500, or a business-rule
  rejection ("this listing was already marked sold") always has a
  toast-ready string, while field-level problems always have a place to
  render inline. No error should ever be forced into the wrong channel.

## 7. Common shared primitives created in this plan

Kept deliberately small — genuinely cross-cutting only:

```text
packages/validation/src/
├── common/
│   ├── errors.ts        # ApiErrorSchema (§6)
│   ├── pagination.ts     # PageRequestSchema, PageResponseSchema<T>
│   └── money.ts           # MoneyPenceSchema (non-negative int)
└── enums/
    ├── fuel.ts             # PETROL | DIESEL | HYBRID | PHEV | ELECTRIC | HYDROGEN
    ├── transmission.ts      # MANUAL | AUTOMATIC | DCT | CVT
    ├── drivetrain.ts          # FWD | RWD | AWD
    └── body-style.ts           # HATCHBACK | SALOON | ESTATE | COUPE | CONVERTIBLE | SUV | MPV | PICKUP
```

These four enums are pulled forward from the catalogue doc specifically
because they're referenced by *multiple* future plans (search filters in
Plan 13, catalogue in Plan 08, comparison in Plan 18) before Plan 08
formally owns the rest of the catalogue schema — defining them once now
avoids two plans racing to declare the same enum differently.

Everything else enum-shaped in the idea docs (colour families, equipment
taxonomy, engine families, analytics event names, advert wizard steps,
etc.) is **not** created here — each belongs to the plan that owns that
domain (Plan 08 catalogue, Plan 27 analytics, Plan 20 advert wizard) and
must simply follow the `UPPER_SNAKE_CASE` rule from §3.

## 8. Schema authoring conventions for every later plan

Documented once here so no plan has to restate it:

- One schema per exported concept, named `<Thing>Schema`, type derived as
  `<Thing>` via `z.infer`.
- Request/response pairs are separate schemas even when nearly identical
  (`CreateListingRequestSchema` vs `ListingSchema`) — request schemas omit
  server-generated fields (`id`, `createdAt`) rather than making them
  `.optional()` on the response type.
- Schemas needing localized/human error messages set them inline via Zod's
  `message:` option at the field level — this is what ends up rendered
  below the input, so it must already be user-facing copy, not a generic
  "Invalid" string.
- Every schema file gets a colocated `*.test.ts` asserting at least one
  passing and one failing case per field — cheap, and it's the thing that
  catches a schema silently accepting bad data.
- No schema imports from an app (`apps/web`, `apps/api`, `apps/mobile`) —
  dependency direction is always packages → apps, never the reverse.

## 9. Why this is safe as a monorepo (no version-skew problem)

Because `validation`/`types` are workspace-linked source (per Plan 01, no
build/publish step), `api`, `web`, and `mobile` always compile against
the exact same schema code as of the current commit — there's no
published-package version to bump or fall out of sync, unlike a
multi-repo setup. A schema change and every consumer of it land in the
same commit/PR by construction. This is a real advantage of the monorepo
choice and is worth remembering when a later plan is tempted to "just
inline a quick type" in an app instead of adding it here.

## 10. Out of scope for this plan

- Any vehicle/listing/catalogue/auth/analytics domain schema content →
  owned by Plans 06/08/07/27 respectively, built on these conventions
- Rendering errors in the UI (toast component, inline error component) →
  **Plan 04**
- NestJS pipe wiring that actually calls these schemas → **Plan 05**

## 11. Acceptance criteria

- [ ] `packages/validation` exports `ApiErrorSchema`, `PageRequestSchema`,
      `PageResponseSchema`, `MoneyPenceSchema`, and the four enums in §7,
      each with a passing/failing test.
- [ ] `packages/types` re-exports every inferred type above plus the
      branded-ID helper from §5, importable from `apps/web`, `apps/api`,
      and `apps/mobile` without pulling `zod` into a package that only
      needs the type.
- [ ] A short `CONTRIBUTING.md` (or section in the root README) states the
      conventions from §3, §5, §6, and §8 so they don't live only in this
      plan document.
- [ ] `pnpm lint`/`typecheck`/`test` remain green after adding these
      packages' real content.

## 12. Open questions for you

1. §4 — confirm `camelCase` in TS/API with `snake_case` kept only in
   catalogue JSON staging files, or would you rather standardize on one
   casing everywhere end-to-end?
2. §5 — confirm the slug-ID-for-catalogue / prefixed-ULID-for-transactional
   split, or would you prefer one ID scheme for every entity?
3. Any additional enum you already know is used in more than one upcoming
   plan (beyond the four in §7) that should be pulled forward now instead
   of risking duplication later?
