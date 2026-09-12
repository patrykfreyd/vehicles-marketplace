# Plan 03 — Shared Types & Validation Package

Status: Implemented — resolved 2026-09
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
| TS/JSON field names | `camelCase`, end-to-end, no exceptions (`powerBhp`, `engineCapacityCc`) | Idiomatic for TS/JSON APIs; see §4 — the catalogue JSON staging files use `camelCase` too, **not** `snake_case` (decided 2026-09, overriding this plan's original default) |
| Units in field names | Always suffix the unit (`powerBhp`, `torqueNm`, `engineCapacityCc`, `zeroToSixtyTwoSeconds`) | Carried directly from the catalogue doc's examples — never a bare ambiguous `power` |
| Money | Integer **minor units** (pence), never a float; field name suffixed `Pence` (`pricePence`) | Avoids float rounding bugs in price comparisons/filters |
| Timestamps | ISO 8601 UTC strings over the wire, `Date` internally | Standard, unambiguous across web/mobile/API |

## 4. Decision: JSON staging vs TypeScript field casing — `camelCase` everywhere

The catalogue doc's example JSON files use `snake_case`
(`engine_capacity_cc`, `power_bhp`). This plan originally proposed keeping
`snake_case` in the catalogue JSON staging files and having the Plan 09
importer translate to `camelCase`. **Overridden 2026-09: `camelCase`
end-to-end, no translation step, no exceptions.**

- **Catalogue JSON staging files** (authored/edited by humans and AI per
  Plan 08/09) use `camelCase` (`engineCapacityCc`, `powerBhp`) — same as
  everywhere else. Plan 08/09 write the staging JSON examples/schema with
  this casing rather than the idea doc's `snake_case` examples.
- **Everything downstream** — the Postgres schema (via Prisma, which maps
  to `snake_case` columns but exposes `camelCase` in the generated
  client), the API, and all Zod schemas/TS types — also uses `camelCase`,
  as originally planned.
- There is therefore **no field-name-casing translation step anywhere in
  this repo**. The catalogue importer (Plan 09) still owns turning staging
  JSON into domain objects, but that mapping no longer includes a casing
  conversion.

## 5. Entity ID strategy

The idea docs show two different ID shapes in their examples:

```text
der_bmw_m4_g82_comp_xdrive        ← catalogue: human-readable stable slug
veh_01HZX82K7Q4M                  ← vehicle/listing: prefixed opaque ID
lst_01HZYC421Q
```

This plan adopts both, deliberately, for different entity classes —
confirmed as-is, 2026-09, no changes from the original proposal:

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
  self-describing in logs/errors. Generate one with
  `createId('usr')` from `packages/utils` (backed by the `ulid` package).

To stop ID types being accidentally interchangeable (passing a
`derivativeId` where a `vehicleId` is expected compiles fine with plain
strings), `packages/types` defines a small branded-ID helper:

```ts
export type Id<Brand extends string> = string & { readonly __brand: Brand };

// Each owning plan adds its own alias when it introduces the entity, e.g.:
export type VehicleId = Id<'Vehicle'>;
export type ListingId = Id<'Listing'>;
export type DerivativeId = Id<'Derivative'>;
```

Each owning plan adds its own branded ID type alias when it introduces the
entity — this plan just establishes the pattern and creates the `Id<Brand>`
helper (no per-entity aliases are pre-declared here).

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

- [x] `packages/validation` exports `ApiErrorSchema`, `PageRequestSchema`,
      `PageResponseSchema`, `MoneyPenceSchema`, and the four enums in §7,
      each with a passing/failing test.
- [x] `packages/types` re-exports every inferred type above plus the
      branded-ID helper from §5, importable from `apps/web`, `apps/api`,
      and `apps/mobile` without pulling `zod` into a package that only
      needs the type. (Dependency direction is `types` → `validation` only,
      via `import type`, fully erased at compile time — see §2.)
- [x] A short `CONTRIBUTING.md` (or section in the root README) states the
      conventions from §3, §5, §6, and §8 so they don't live only in this
      plan document.
- [x] `pnpm lint`/`typecheck`/`test` remain green after adding these
      packages' real content.

## 12. Open questions for you — resolved 2026-09

1. §4 — **`camelCase` everywhere, end-to-end, including catalogue JSON
   staging files.** No `snake_case` anywhere in the repo, no field-name
   translation step. See the updated §4.
2. §5 — **confirmed as originally proposed**: slug IDs for catalogue
   entities, prefixed ULIDs for transactional entities. No changes.
3. No additional enum identified — the four in §7 (fuel, transmission,
   drivetrain, body-style) are the only ones pulled forward. Everything
   else enum-shaped stays with the plan that owns that domain.
