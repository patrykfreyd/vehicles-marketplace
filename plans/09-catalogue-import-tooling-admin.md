# Plan 09 — Catalogue Import Tooling & Admin

Status: Draft
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

- [ ] `catalogue validate` and `catalogue import` succeed against Plan
      08's BMW M4 fixture, producing a `CatalogueImport` row and a report
      matching the idea doc's example format.
- [ ] `catalogue report bmw` shows the correct completeness percentage per
      generation, computed via Plan 08 §8's formula.
- [ ] `catalogue find-duplicates` correctly flags an intentionally
      duplicated derivative added to a test fixture, without auto-merging
      it.
- [ ] `catalogue enrich` produces a schema-valid `AI_DRAFT` file that is
      **not** importable as `APPROVED` without going through the review
      steps in §6.
- [ ] The Admin UI, as a non-admin user, is fully inaccessible (403/
      redirect); as an admin, it lists BMW, drills into the M4 G82
      derivative, shows any open validation issues, and an approve action
      correctly flips `status` to `APPROVED` with a success toast.
- [ ] Only `APPROVED` derivatives are returned by a basic "list published
      catalogue" query used as this plan's stand-in for Plan 13's future
      search integration.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm deferring bulk open-dataset import (§3) in favor of starting
   BMW directly with hand+AI authoring — or do you already have a
   specific open dataset in mind that changes this calculus?
2. Confirm the Admin lives inside `apps/web` behind `isAdmin`, rather than
   as a separate internal-only application.
3. Any specific AI provider you want `AiClient` built against first, or
   should this plan pick one provisionally (revisited when Plan 14
   designs AI Search properly)?
