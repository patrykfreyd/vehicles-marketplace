# Contributing conventions

Repo-wide conventions fixed by
[`plans/03-shared-types-validation.md`](plans/03-shared-types-validation.md)
so they don't live only in that plan document. Every later plan's domain
schemas (vehicle, listing, catalogue, auth, analytics events, ...) must
follow these.

## Types vs validation

- **`packages/validation`** — Zod schemas. This is the runtime source of
  truth: every API boundary (request body, response, form input, AI
  output, background job payload, config) validates against a schema that
  lives here.
- **`packages/types`** — plain TypeScript types. Re-exports `z.infer<>`
  types from `validation` (so UI code can import a type without pulling
  `zod` into its dependency graph) plus types with no runtime-validation
  need (branded ID types, generic API envelopes, utility types).
- A schema is always written once, in `validation`; its type is always
  derived with `z.infer`, never hand-duplicated in `types`.
- Dependencies only ever point `types` → `validation`, never the reverse —
  `validation` must not import from `types`. A cross-package cycle here
  breaks Turborepo's task graph outright (confirmed while implementing
  Plan 03), not just a style violation.

## Naming & field casing

| Area                   | Convention                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Enum/controlled values | `UPPER_SNAKE_CASE` (`AWD`, `PETROL`, `LISTING_VIEW`)                                                                          |
| All field names        | `camelCase` — everywhere, no exceptions (`powerBhp`, `engineCapacityCc`, `pricePence`)                                        |
| Units in field names   | Always suffix the unit (`powerBhp`, `torqueNm`, `engineCapacityCc`, `zeroToSixtyTwoSeconds`) — never a bare ambiguous `power` |
| Money                  | Integer **minor units** (pence), never a float; field name suffixed `Pence` (`pricePence`)                                    |
| Timestamps             | ISO 8601 UTC strings over the wire, `Date` internally                                                                         |

**`camelCase` applies end-to-end, including catalogue JSON staging files.**
Plan 03's original draft proposed keeping `snake_case` in the catalogue's
human/AI-edited staging JSON (matching the idea docs' examples) and having
the Plan 09 importer translate `snake_case` → `camelCase`. That's been
overridden: there is **no casing translation step anywhere in this repo**.
Catalogue JSON staging files (Plan 08/09) use `camelCase` fields too, same
as the API, the Zod schemas, and the Postgres/Prisma layer.

## Entity ID strategy

Two ID shapes, for two different entity classes:

- **Catalogue entities** (make, model, generation, derivative, engine,
  colour, equipment) use **stable, human-readable slug IDs**
  (`bmw`, `bmw-m4`, `bmw-m4-g82`, `bmw-m4-g82-competition-xdrive`) — they're
  curated, low-volume, and the slug is useful in URLs and logs. Owned in
  full by Plan 08.
- **Transactional entities** (user, vehicle, listing, message,
  conversation, analytics event, etc.) use **prefixed ULIDs**
  (`usr_01HZ...`, `veh_01HZ...`, `lst_01HZ...`) — sortable by creation
  time, collision-free without a DB round trip, and self-describing in
  logs/errors. Generate these with `createId('usr')` from
  `@vehicles-marketplace/utils`.

To stop different entities' IDs being accidentally interchangeable,
`packages/types` exports a branded-ID helper:

```ts
export type Id<Brand extends string> = string & { readonly __brand: Brand };
```

Each plan that introduces an entity adds its own `type FooId = Id<'Foo'>`
alias when it does so — this repo does not pre-declare IDs for entities
that don't exist yet.

## The shared API error contract

Every NestJS exception filter serializes errors into this shape
(`ApiErrorSchema` in `packages/validation/src/common/errors.ts`):

```ts
export const ApiErrorSchema = z.object({
  code: z.string(), // e.g. "VALIDATION_ERROR", "NOT_FOUND"
  message: z.string(), // human-readable, toast-safe summary
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(), // VALIDATION_ERROR only
});
```

- `fieldErrors[fieldName]` is read by the form layer and rendered inline
  below the relevant input. Zod's own `.flatten().fieldErrors` maps
  directly onto this shape.
- `message` (and any error with no `fieldErrors`) is what the toast system
  renders. No error should ever be forced into the wrong channel.

## Schema authoring conventions

- One schema per exported concept, named `<Thing>Schema`, type derived as
  `<Thing>` via `z.infer`.
- Request/response pairs are separate schemas even when nearly identical
  (`CreateListingRequestSchema` vs `ListingSchema`) — request schemas omit
  server-generated fields (`id`, `createdAt`) rather than making them
  `.optional()` on the response type.
- Schemas needing localized/human error messages set them inline via Zod's
  message option at the field level — this is what ends up rendered below
  the input, so it must already be user-facing copy, not a generic
  "Invalid" string.
- Every schema file gets a colocated `*.test.ts` asserting at least one
  passing and one failing case per field.
- No schema imports from an app (`apps/web`, `apps/api`, `apps/mobile`) —
  dependency direction is always packages → apps, never the reverse.

## Shared primitives already implemented

`packages/validation` exports, plus a colocated test for each:

```text
src/
├── common/
│   ├── errors.ts       # ApiErrorSchema
│   ├── health.ts       # ApiHealthCheckSchema (GET /api/v1/health's body — Plan 05)
│   ├── pagination.ts   # PageRequestSchema, PageResponseSchema(itemSchema)
│   └── money.ts        # MoneyPenceSchema
└── enums/
    ├── fuel.ts          # PETROL | DIESEL | HYBRID | PHEV | ELECTRIC | HYDROGEN
    ├── transmission.ts  # MANUAL | AUTOMATIC | DCT | CVT
    ├── drivetrain.ts    # FWD | RWD | AWD
    └── body-style.ts    # HATCHBACK | SALOON | ESTATE | COUPE | CONVERTIBLE | SUV | MPV | PICKUP
```

`packages/types` re-exports every inferred type above
(`ApiError`, `PageRequest`, `PageResponse<T>`, `MoneyPence`, `FuelType`,
`Transmission`, `Drivetrain`, `BodyStyle`) plus the `Id<Brand>` helper.

Everything else enum-shaped in the idea docs (colour families, equipment
taxonomy, engine families, analytics event names, advert wizard steps,
etc.) belongs to the plan that owns that domain and must simply follow the
`UPPER_SNAKE_CASE` rule above.

## Backend module conventions (Plan 05)

Fixed by
[`plans/05-backend-api-foundation.md`](plans/05-backend-api-foundation.md).
Every module-owning plan from Plan 07 (Auth) onward follows these.

**Module template** — copy this shape for every new `apps/api` module:

```text
apps/api/src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dto/                     # createZodDto(schema) wrappers, one per request/response shape
└── <name>.controller.test.ts
```

`apps/api/src/modules/health/` is the worked example this plan built to
prove the pipeline end-to-end — copy its shape (including how its
`indicators/` subfolder holds dependencies the service composes) for a
module with a comparable amount of supporting logic.

Rules:

- Controllers depend only on their own service and shared providers
  (`ConfigService`, `nestjs-pino`'s `Logger`) — never reach into another
  module's service directly; cross-module calls go through that module's
  exported service via Nest's DI.
- No controller accepts or returns a raw object without a Zod DTO —
  enforced by the `local/require-typed-nest-params` ESLint rule
  (`packages/eslint-config/rules/require-typed-nest-params.js`, wired in
  via `packages/eslint-config`'s `nest` overlay) rejecting an untyped
  `@Body()`/`@Query()`/`@Param()` parameter. Wrap the Zod schema with
  `createZodDto()` from `nestjs-zod` and annotate the parameter with that
  class; document the response the same way with `@ZodResponse()`.
- List endpoints return `PageResponseSchema(itemSchema)` (never a bare
  array); single-resource endpoints return the resource directly, no
  `{ data: ... }` envelope.

**Error codes** — every thrown/validation error serializes to
`ApiErrorSchema` via the one global `ApiExceptionFilter`
(`apps/api/src/common/filters/api-exception.filter.ts`). The fixed code
list: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` (a 503 — currently only
`GET /health` failing produces this), `INTERNAL_ERROR`. Reuse one of these;
don't invent a new code in a feature plan without updating this list. A
deliberately-thrown 4xx `HttpException`'s `message` is shown to the client
as-is; anything resolving to a 5xx (including a bug that throws one) is
logged in full and replaced with a generic message before it reaches the
client — never add detail to a 5xx response body to work around this.
