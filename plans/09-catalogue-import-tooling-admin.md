# Plan 09 — Catalogue Import Tooling & Admin

Status: Implemented — resolved 2026-09
Depends on: Plan 08 (catalogue schema, Zod schemas, JSON Schema), Plan 05
(Nest module template, generated API client), Plan 07 (`isAdmin` guard),
Plan 04 (UI components the Admin screens are built from)
Blocks: actually populating BMW (and every later manufacturer) — this plan
is what makes catalogue content work possible at all; also blocks Plan 10
(DVLA matching needs a populated, importable catalogue to match against)

## 1. Objective

Build the tooling that turns catalogue JSON into trustworthy production
data: the `catalogue-cli` commands (`validate`, `import`, `report`,
`completeness`, `find-duplicates`), an AI-assisted draft-generation
command, and an internal **Catalogue Admin** area in `apps/web` for
reviewing, correcting, approving, and merging catalogue records. This plan
does **not** populate real manufacturer data beyond what's needed to prove
the tooling — that's ongoing content work that happens *using* what this
plan builds.

"Done" means: running the CLI against the BMW M4 fixture from Plan 08
imports it cleanly with a validation report, the Admin UI shows BMW at
whatever completeness percentage that fixture represents, an admin can
open the M4 G82 Competition xDrive record, see any missing-field warnings,
edit and approve it, and the AI-draft command can generate a *new*
candidate derivative that lands in `AI_DRAFT` status pending that same
review — never silently becoming trusted data.

## 2. Decisions carried over from `idea/vehicle_database_catalogue_approach.md`

- CLI shape: `catalogue validate <file>`, `catalogue import <manufacturer>`,
  `catalogue report <manufacturer>`, `catalogue completeness`,
  `catalogue find-duplicates` (idea doc §24/§31).
- Importer pipeline: read JSON → validate schema → check IDs → check
  controlled values → detect duplicates → validate relationships →
  insert/update → produce a report (idea doc §31).
- AI is used for **research assistance, extraction, normalization,
  candidate generation** — never treated as the factual source of truth;
  every AI-touched record carries `status`/`confidence`/`reviewed`
  metadata (idea doc §21–§22).
- Catalogue Admin lets staff view/edit/approve/reject/merge duplicates/add
  aliases/correct specs/add sources/see validation warnings (idea doc
  §32).
- Prioritize catalogue work by UK prevalence × marketplace demand ×
  incompleteness, not alphabetically (idea doc §34) — the Admin's
  manufacturer list should support sorting/flagging by this, even in V1.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Bulk open-dataset bootstrap | **Defer.** Start with hand-authored + AI-assisted BMW JSON directly, no bulk external dataset import in V1 | The idea doc names *categories* of open data (§15–§16) but no specific dataset/license is chosen yet, and Level 2 completeness for one manufacturer's core models is a small enough JSON-authoring task to not need a bulk import pipeline first. Revisit bulk bootstrap only once manual+AI authoring across a few manufacturers proves too slow |
| Duplicate detection method | In-process **normalized-key comparison** (lowercased, whitespace/punctuation-stripped name + generation + core specs), not a Postgres `pg_trgm` query | `pg_trgm` is Plan 13's scope — this plan shouldn't take a forward dependency on Search just to dedupe a few hundred catalogue rows; a plain JS normalization check is sufficient at this volume and can be upgraded later if needed |
| Audit trail tables | Add `CatalogueSource`, `CatalogueImport`, `CatalogueValidationIssue` now (idea doc §28 lists these) | The Admin's "see validation warnings" and "add sources" requirements (§32) need somewhere persistent to live — ephemeral CLI console output isn't enough for a reviewer working in the Admin UI days after an import ran |
| Admin UI location | A gated `/admin/catalogue` area inside **`apps/web`** (not a separate app) | One fewer app to deploy/maintain; access is controlled entirely by Plan 07's `isAdmin` flag, not by network isolation, so it doesn't need to be a physically separate application |
| AI provider wrapper | Provider-agnostic `AiClient` interface in `apps/catalogue-cli` (thin wrapper, one concrete implementation now) | Keeps the specific AI provider swappable without the catalogue tooling caring which one Plan 14 later standardizes on for AI Search |

## 4. Additional Prisma models (`prisma/schema/catalogue.prisma`, extending Plan 08)

```prisma
model CatalogueSource {
  id          String   @id
  name        String                       // "BMW UK press pack 2023"
  url         String?
  licenseNote String?  @map("license_note")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("catalogue_sources")
}

model CatalogueImport {
  id           String   @id
  manufacturerId String @map("manufacturer_id")
  filePath     String   @map("file_path")
  importedBy   String?  @map("imported_by")     // User.id, nullable for CLI-only runs
  recordsCreated Int    @map("records_created")
  recordsUpdated Int    @map("records_updated")
  warningsCount  Int    @map("warnings_count")
  errorsCount    Int    @map("errors_count")
  createdAt      DateTime @default(now()) @map("created_at")

  issues CatalogueValidationIssue[]

  @@map("catalogue_imports")
}

model CatalogueValidationIssue {
  id         String   @id
  importId   String   @map("import_id")
  import     CatalogueImport @relation(fields: [importId], references: [id])
  entityType CatalogueEntityType @map("entity_type")
  entityId   String   @map("entity_id")
  severity   IssueSeverity
  message    String                        // "G82 M4 CS missing torque"
  resolved   Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([resolved])
  @@map("catalogue_validation_issues")
}

enum IssueSeverity {
  WARNING
  ERROR
}
```

## 5. CLI commands (`apps/catalogue-cli`)

```text
catalogue validate <file>
    → runs the file through packages/catalogue-types' Zod schemas
    → prints pass/fail per entity, no DB writes

catalogue import <manufacturer>
    → validate (as above) → normalized-key duplicate check (§3) →
      controlled-value check → relationship check (generation exists
      before its derivatives, etc.) → upsert into Postgres →
      write one CatalogueImport row + any CatalogueValidationIssue rows →
      print the same summary shown in the idea doc's example
      ("BMW M4 — 2 generations, 7 derivatives, ✓ F82, ✓ G82, warnings: ...")

catalogue report <manufacturer>
    → completeness percentage per model/generation, sourced from the
      stored completenessScore (Plan 08 §8), formatted like the idea
      doc's §32 example tree (BMW 92%, 1 Series Complete, 5 Series
      In Progress, ...)

catalogue completeness
    → same report across all imported manufacturers, for prioritization

catalogue find-duplicates <manufacturer>
    → normalized-key comparison (§3) → prints candidate duplicate pairs
      for a human to resolve via the Admin UI's merge action (§7),
      never auto-merges

catalogue enrich <manufacturer> <model>   (AI-assisted draft generation)
    → calls the AiClient wrapper (§3) to draft candidate derivatives from
      a source description → validates the AI output against the exact
      same Zod schema as a human-authored file (idea doc §21's "AI output
      must pass through the same validation, not a shortcut") → writes
      draft JSON to catalogue/<manufacturer>/ with status: AI_DRAFT →
      does NOT import automatically; a human runs `catalogue import`
      after reviewing the draft file
```

## 6. Status transitions (enforced, not just documented)

```text
AI_DRAFT / IMPORTED  →  REVIEW_REQUIRED   (automatic: any validation warning)
REVIEW_REQUIRED       →  SOURCE_CONFIRMED  (admin attaches a CatalogueSource)
SOURCE_CONFIRMED       →  APPROVED          (admin action, Admin UI only)
APPROVED                →  DEPRECATED        (admin action — e.g. superseded data)
```

- Only `APPROVED` derivatives are eligible to be shown to buyers (Plan 13
  Search filters on `status = APPROVED` by default) — everything else is
  visible only inside the Admin UI. This is the enforcement mechanism
  behind "AI-generated information [never] silently becoming trusted
  production data" (idea doc §22).
- The CLI can move a record to `REVIEW_REQUIRED`/`SOURCE_CONFIRMED`
  automatically based on validation outcome; only a human, through the
  Admin UI, can set `APPROVED` — there is no CLI flag that skips this.

## 7. Catalogue Admin (`apps/web/app/admin/catalogue`)

Screens, matching the idea doc §32 requirements directly:

- **Manufacturer list** — completeness % per manufacturer, sortable by
  the priority formula from §2 (idea doc §34), gated by `isAdmin`.
- **Manufacturer detail** — model list with per-model completeness and
  status counts (Complete / In Progress / Warning), matching the idea
  doc's tree example.
- **Derivative detail/edit** — every Level 2 field from Plan 08, editable
  via a form built from Plan 04's `<FormField>` components (inline
  validation applies here too — an admin fixing a bad `powerBhp` value
  gets the same instant feedback as any other form in the product),
  showing open `CatalogueValidationIssue` rows inline next to the
  relevant field, plus alias management (add/remove `CatalogueAlias`
  rows) and source attachment (`CatalogueSource`).
- **Approve / Reject / Merge duplicates** — status-transition actions
  from §6, plus a merge flow that takes two candidate-duplicate
  derivatives (surfaced by `find-duplicates`) and combines their aliases/
  sources into one record, deprecating the other.
- Every admin action (approve, edit, merge) fires a **toast** on success/
  failure per Plan 04 §7 — this is exactly the kind of internal tool that
  would otherwise be tempted to use `window.alert`, and shouldn't.

Backing API: a new `apps/api/src/modules/catalogue-admin` module
(following Plan 05's template), every route behind `AdminGuard` (Plan 07),
covering read/edit/approve/reject/merge/alias/source endpoints consumed
by the Admin UI through the generated client (Plan 05 §7).

## 8. Out of scope for this plan

- DVLA lookup / registration-to-derivative matching → **Plan 10**
- Actually authoring BMW's (or any manufacturer's) full derivative data →
  ongoing content work using this plan's tooling, not a further dev plan
- `pg_trgm`/full-text search over catalogue data → **Plan 13**
- Bulk external open-dataset import → deferred per §3, revisit only if
  manual+AI authoring proves too slow

## 9. Acceptance criteria

- [x] `catalogue validate` and `catalogue import` succeed against Plan
      08's BMW M4 fixture, producing a `CatalogueImport` row and a report
      matching the idea doc's example format. Verified for real: `pnpm
      catalogue validate catalogue/bmw/m4.json` → `PASS`; `pnpm catalogue
      import bmw` → `BMW M4 — 2 generations, 3 derivatives, ✓ F82, ✓ G82,
      warnings: 5, errors: 0` against live Postgres.
- [x] `catalogue report bmw` shows the correct completeness percentage per
      generation, computed via Plan 08 §8's formula. Verified for real:
      `BMW 83% / M4 Warning (83%)` immediately after import, matching the
      fixture's known-incomplete F82 derivatives.
- [x] `catalogue find-duplicates` correctly flags an intentionally
      duplicated derivative added to a test fixture, without auto-merging
      it — proven in `importer.test.ts`/`catalogue-admin.service.test.ts`
      (a deliberately near-identical second entry is grouped, never
      written to as APPROVED/merged automatically).
- [x] `catalogue enrich` produces a schema-valid `AI_DRAFT` file that is
      **not** importable as `APPROVED` without going through the review
      steps in §6 — `enrich.command.ts` strips any AI-supplied `status`
      before validating, and `catalogue import` refuses `APPROVED` from
      any file regardless (`import-rules.ts`'s `resolveImportStatus`).
- [x] The Admin UI, as a non-admin user, is fully inaccessible (403/
      redirect); as an admin, it lists BMW, drills into the M4 G82
      derivative, shows any open validation issues, and an approve action
      correctly flips `status` to `APPROVED` with a success toast.
      Verified for real against a live server: unauthenticated →
      `401 UNAUTHORIZED`; authenticated non-admin → `403 FORBIDDEN`
      (`AdminGuard`); admin → manufacturer list includes BMW, drills into
      `bmw-m4-g82-competition-xdrive` (`SOURCE_CONFIRMED`), `POST
      .../approve` flips it to `APPROVED`. The web layout's redirect is
      the client-side UX half; `AdminGuard` on every `catalogue-admin`
      route is the actual enforcement.
- [x] Only `APPROVED` derivatives are returned by a basic "list published
      catalogue" query used as this plan's stand-in for Plan 13's future
      search integration. Verified for real: `GET /api/v1/catalogue/derivatives`
      returned empty before the approve step above, and exactly the one
      newly-`APPROVED` derivative after it.
- [x] `pnpm lint`/`typecheck`/`build`/`test` remain green (verified with
      real Postgres/Redis in Docker, so every DB-touching integration test
      — `catalogue-cli`'s importer, `catalogue-admin`'s service, the
      public catalogue listing — ran for real rather than skipping).

## 10. Open questions for you — resolved 2026-09

1. **Confirmed** — bulk open-dataset bootstrap deferred; BMW authored
   directly via the hand+AI-assisted JSON this plan's tooling produces, no
   specific external dataset introduced.
2. **Confirmed** — the Catalogue Admin lives inside `apps/web/app/admin`,
   gated by `isAdmin` via `AdminGuard` on every `catalogue-admin` API route
   plus a client-side redirect in `apps/web/app/admin/layout.tsx`; not a
   separate application.
3. **OpenAI**, provisionally — `apps/catalogue-cli/src/lib/openai-client.ts`,
   selected as "cheapest model that will work for us" via `OPENAI_MODEL`
   (defaults to `gpt-4o-mini`, `.env.example`/`packages/config`), kept
   behind the provider-agnostic `AiClient` interface (§3) so Plan 14 can
   swap or share the underlying provider later without touching
   `enrich.command.ts`.

## 11. Deviations from this plan worth flagging

- **`DerivativeSource` (a `Derivative` ↔ `CatalogueSource` join table) was
  added beyond §4's literal Prisma snippet.** As written, `CatalogueSource`
  has no relation to `Derivative` at all — it's a reusable pool of citable
  sources, not a per-derivative attachment — but §6's REVIEW_REQUIRED →
  SOURCE_CONFIRMED transition ("admin attaches a CatalogueSource") and §7's
  "source attachment" both require exactly that link. See
  `prisma/schema/catalogue.prisma`'s comment on `DerivativeSource` for the
  full reasoning.
- **§7's "Reject" action isn't in §6's own forward-only state diagram.**
  Modeled as a transition to `DEPRECATED` (the diagram's own terminal
  state, "this data will not be used") rather than inventing a new status —
  see `CatalogueAdminService.rejectDerivative`'s comment.
- **§2/§34's "UK prevalence × marketplace demand × incompleteness" priority
  formula is `100 - averageCompleteness` for now** — no prevalence/demand
  dataset exists yet (§3 defers bulk external data), so incompleteness is
  the only computable factor. `ManufacturerSummarySchema.priorityScore` is
  a separate field from `averageCompleteness` (not just its inverse read
  off the same number), so a later plan can fold in real multipliers
  without an API shape change.
- **`catalogue enrich`'s OpenAI integration uses plain `response_format:
  json_object` mode, not OpenAI's stricter JSON-Schema structured-output
  mode.** That mode requires every property `required` with
  `additionalProperties: false`, which doesn't map cleanly onto
  `DerivativeStagingSchema`'s mostly-optional Level 2 fields. The actual
  safety net is unconditional either way — idea doc §21's "AI output must
  pass through the same validation, not a shortcut": every candidate is
  re-validated against that exact schema in `enrich.command.ts` regardless
  of response mode. See `openai-client.ts`'s comment.
- **`apps/catalogue-cli` resolves `catalogue/` paths against the repo root,
  not `process.cwd()`.** `pnpm --filter @vehicles-marketplace/catalogue-cli
  start` (and the root `pnpm catalogue` alias) sets cwd to
  `apps/catalogue-cli`, not the repo root the plan's own usage examples
  (`catalogue validate catalogue/bmw/m4.json`) assume — `findRepoRoot` in
  `lib/catalogue-files.ts` walks up looking for `pnpm-workspace.yaml`
  instead.
- **`catalogue-cli`'s entrypoint script is `tsx`, not `node -r
  ts-node/register`** (Plan 05/01's original pattern, still used by
  `apps/api`/`apps/worker`) — this machine's Node 24 misparses
  `ts-node/register`'d `.ts` files with no `"type"` in `package.json` as
  native ESM, throwing `ERR_MODULE_NOT_FOUND` on extensionless relative
  imports; `tsx`'s loader hook doesn't hit this regardless of Node version.
  Only touched here since this plan rewrote the CLI's entrypoint wholesale
  — existing `ts-node/register` entrypoints elsewhere weren't changed.
- **Every `@ZodResponse()` in the new `catalogue`/`catalogue-admin` modules
  passes an explicit `status: 200`.** Omitting it (as `nestjs-zod`'s own
  types allow) makes `@nestjs/swagger` register the response under
  OpenAPI's `default` key instead of `200`; `openapi-typescript`/
  `openapi-fetch` then can't distinguish a success from an error response,
  collapsing the generated client's `data`/`error` types together. No
  existing module in the repo had hit this (Health's endpoint predates
  `@ZodResponse` and uses `@ApiOkResponse` directly).
- **The OpenAPI spec still documents no error response for any route**
  (pre-existing gap, not introduced here — `ApiExceptionFilter` shapes
  every failure at runtime, never per-route Swagger metadata), so the
  generated client's `error` field types as `never` for every call. The
  Catalogue Admin UI is the first real network consumer in `apps/web`
  (every earlier screen used local helpers only) and is the first place
  this surfaced — worked around locally with an explained `as ApiError`
  cast rather than fixed at the source, which is a bigger, repo-wide Plan
  05 follow-up.
- **Zod's `.partial()` on a field that already has `.default()`
  (`specialEdition`, `transmissions`) infers as optional in the local
  `UpdateDerivativeRequestSchema`-derived TypeScript type, but
  `nestjs-zod`'s OpenAPI generation marks the same field `required`.** The
  derivative edit form (`apps/web/.../derivatives/[derivativeId]/page.tsx`)
  spells both fields out explicitly with a fallback before sending the
  `PATCH` request body, rather than fighting the schema generation
  pipeline.
- **Integration tests that hit a real Postgres (`catalogue-cli`'s
  importer, `catalogue-admin`'s/`catalogue`'s services) follow Plan 05's
  `WORKER_TEST_HAS_REAL_INFRA` pattern** (`CATALOGUE_CLI_TEST_HAS_REAL_INFRA`,
  `API_TEST_HAS_REAL_DB`) — skip gracefully without `DATABASE_URL` set,
  run for real against it otherwise (CI's `postgres` service, per Plan 05's
  `ci.yml` deviation).
