# Plan 06 — Database Schema & Migrations Baseline

Status: Implemented — resolved 2026-09
Depends on: Plan 02 (`DATABASE_URL` contract, Local Postgres running), Plan
03 (casing convention, ID strategy, enums this schema uses), Plan 05
(Prisma client consumed as an injectable provider in `apps/api`/
`apps/worker`)
Blocks: Plan 07 (Auth extends the baseline `User` model), Plan 08
(Catalogue adds its own model set alongside this baseline), Plan 11
(Vehicle/Listing get their full field set on top of the stubs this plan
creates), Plan 12 (Media), Plan 25 (Message/Conversation)

## 1. Objective

Set up **Prisma** as the ORM, fix the schema conventions every later
model must follow, prove the Local→Test→Production migration workflow
end-to-end, and create a deliberately **minimal baseline schema** — just
enough of `User`, `Vehicle`, `Listing`, `Media`, `Conversation`, and
`Message` to prove the plumbing works. Full field-level detail for each of
those belongs to the plan that owns that entity (§7 spells out exactly
where the line is).

"Done" means: `pnpm db:migrate:dev` creates a real migration from a real
schema, `pnpm db:seed` inserts a test user, `packages/db`'s exported client
is queryable from `apps/api`, and the migration has been applied
successfully against a Test-shaped environment following Plan 02's
promotion flow.

## 2. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Client access pattern | New package **`packages/db`** wraps a singleton `PrismaClient` and re-exports generated types | Every app/module gets the *same* client instance and the *same* type imports, rather than each app instantiating its own `PrismaClient` (wastes connections) or importing `@prisma/client` directly (couples every consumer to Prisma's raw API instead of one seam) |
| Schema file layout | Prisma's **multi-file schema** feature (`prisma/schema/*.prisma` instead of one `schema.prisma`) | With 17+ modules eventually adding models, one giant file becomes an unreviewable merge-conflict magnet; each owning plan adds its own file (`prisma/schema/vehicle.prisma`, `prisma/schema/catalogue.prisma`, etc.) instead of all editing the same file |
| Table/column casing | Prisma model fields **camelCase**; `@@map`/`@map` to **snake_case** table/column names | Matches Plan 03 §3/§4's decision (camelCase in the TS layer) while keeping SQL itself in the conventional snake_case DBAs expect — Prisma's mapping feature makes this free |
| ID generation | **Application-generated**, not DB-generated: every `create()` call supplies an `id` from `packages/utils`' `generateId(prefix)` helper (Plan 03 §5's prefixed ULIDs) | Prisma has no built-in "prefixed ULID" default; generating in application code (rather than `@default(uuid())` or `@default(cuid())`) keeps the ID format from Plan 03 consistent instead of introducing a second ID shape |
| Entity lifecycle vs. deletion | **Status/state fields model lifecycle** (e.g. `Listing.status: DRAFT \| LIVE \| RESERVED \| SOLD \| ARCHIVED`); no default `deletedAt` soft-delete column added blanket across every table | The marketplace needs history (price changes, sold listings, message history) preserved, not hidden behind a soft-delete flag — each owning plan decides its own lifecycle states; true GDPR erasure is a deliberate, audited procedure owned by **Plan 38**, not a column default |
| Connection strategy | Single long-lived `PrismaClient` instance per process (`api`, `worker`) | We're a long-running Node server on a VPS, not serverless functions — no Prisma Data Proxy / pgbouncer complexity needed at this stage, consistent with the stack doc's "boring infra" principle |

## 3. Package structure addition

```text
packages/db/
├── prisma -> ../../prisma        # (or root prisma/ stays the single source; see below)
├── src/
│   ├── client.ts        # singleton PrismaClient, imported everywhere instead of `new PrismaClient()`
│   └── index.ts           # re-exports client + generated types
└── package.json

prisma/
├── schema/
│   ├── schema.prisma       # datasource + generator block only
│   ├── user.prisma          # this plan
│   ├── vehicle.prisma         # this plan (stub) — extended by Plan 11
│   ├── listing.prisma          # this plan (stub) — extended by Plan 11
│   ├── media.prisma             # this plan (stub) — extended by Plan 12
│   ├── conversation.prisma       # this plan (stub) — extended by Plan 25
│   └── message.prisma             # this plan (stub) — extended by Plan 25
├── migrations/
└── seed/
    └── index.ts
```

Prisma's schema stays at the repo root (matching Plan 01's tree) rather
than moving under `packages/db` — `packages/db` is a thin **client**
package; the schema is a repo-wide artifact that migrations, the CI
pipeline (Plan 35), and `docker-compose` all reference by a fixed path.

```ts
// packages/db/src/client.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined; // avoids duplicate clients on hot reload
}

export const db = globalThis.__prisma ?? new PrismaClient();
if (process.env.APP_ENV !== "production") globalThis.__prisma = db;
```

## 4. Baseline schema — this plan's actual scope

Every model below is intentionally minimal — just identity, the couple of
fields needed to prove relations/migrations work, and a clear "extended
by" pointer. **No search fields, no equipment, no history, no analytics
columns here** — those arrive with their owning plan's migration.

```prisma
// prisma/schema/user.prisma
model User {
  id          String   @id
  email       String   @unique
  displayName String?  @map("display_name")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  vehicles     Vehicle[]
  listings     Listing[]
  messages     Message[]

  @@map("users")
}
```

```prisma
// prisma/schema/vehicle.prisma  — stub; full fields in Plan 11
model Vehicle {
  id          String   @id
  ownerId     String   @map("owner_id")
  owner       User     @relation(fields: [ownerId], references: [id])
  // derivativeId intentionally omitted here — added in Plan 11 once
  // Plan 08's catalogue tables exist to reference
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  listings Listing[]

  @@map("vehicles")
}
```

```prisma
// prisma/schema/listing.prisma — stub; full fields in Plan 11
enum ListingStatus {
  DRAFT
  LIVE
  RESERVED
  SOLD
  ARCHIVED
}

model Listing {
  id         String        @id
  vehicleId  String        @map("vehicle_id")
  vehicle    Vehicle       @relation(fields: [vehicleId], references: [id])
  sellerId   String        @map("seller_id")
  seller     User          @relation(fields: [sellerId], references: [id])
  status     ListingStatus @default(DRAFT)
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  @@index([status])
  @@map("listings")
}
```

```prisma
// prisma/schema/media.prisma — stub; full fields (image type enum, variants) in Plan 12
model Media {
  id        String   @id
  listingId String   @map("listing_id")
  listing   Listing  @relation(fields: [listingId], references: [id])
  path      String
  position  Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("media")
}
```

```prisma
// prisma/schema/conversation.prisma + message.prisma — stubs; full fields in Plan 25
model Conversation {
  id        String    @id
  createdAt DateTime  @default(now()) @map("created_at")
  messages  Message[]

  @@map("conversations")
}

model Message {
  id             String       @id
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  senderId       String       @map("sender_id")
  sender         User         @relation(fields: [senderId], references: [id])
  body           String
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([conversationId])
  @@map("messages")
}
```

## 5. Migration & seed workflow

Scripts added to the root `package.json` (thin wrappers around Prisma
CLI, matching the flow already documented in the stack doc §3.6/§27):

```json
{
  "scripts": {
    "db:migrate:dev": "prisma migrate dev --schema prisma/schema",
    "db:migrate:deploy": "prisma migrate deploy --schema prisma/schema",
    "db:generate": "prisma generate --schema prisma/schema",
    "db:seed": "tsx prisma/seed/index.ts",
    "db:studio": "prisma studio --schema prisma/schema"
  }
}
```

Workflow (unchanged from the stack doc, restated as the concrete commands
this plan wires up):

```text
Edit prisma/schema/*.prisma
        ↓
pnpm db:migrate:dev        (creates + applies migration, Local only)
        ↓
Commit schema + generated migration SQL
        ↓
Deploy → Test:  pnpm db:migrate:deploy   (never `migrate dev` outside Local)
        ↓
Validate on Test
        ↓
Deploy same migration → Production:  pnpm db:migrate:deploy
```

`prisma/seed/index.ts` (this plan) inserts one test `User` — enough to
prove `db:seed` works. Real domain seed data (sample vehicles, listings,
catalogue fixtures) is added incrementally by the plan that introduces
that data need (e.g. Plan 08 seeds catalogue fixtures, Plan 11 seeds
sample vehicles/listings for local development).

## 6. Conventions for every future migration (documented once here)

- Every model gets `id` (application-generated, §2), `createdAt`, and
  `updatedAt` (except pure join/event tables where `updatedAt` doesn't make
  sense — the owning plan decides).
- Foreign keys are always indexed (`@@index([...FkColumn])`) unless
  already covered by a unique constraint.
- Enums live in the same file as the model that primarily owns them
  (`ListingStatus` in `listing.prisma`) unless shared across many models,
  in which case they move to a `prisma/schema/_shared.prisma`.
- A model never has a bare `status String` — always a Prisma `enum`,
  mirroring Plan 03 §3's "no ad hoc string unions" rule at the database
  layer, not just the TS layer.
- Migrations are never edited after being applied to Test — a mistake gets
  fixed with a new forward migration, per the stack doc's "no manual
  Production schema changes outside the migration process" rule.

## 7. Handoff points to later plans (explicit, so nothing gets built twice)

- **Plan 07 (Auth)** will likely need to run Better Auth's own Prisma
  adapter generator, which appends session/account/verification models
  and may require specific fields on `User`. This plan's `User` model is a
  deliberately minimal placeholder — Plan 07 is expected to extend
  `user.prisma` (not create a competing model), and its own plan document
  will confirm the exact shape Better Auth requires.
- **Plan 08 (Catalogue)** owns an entirely separate model set (Make,
  Model, Generation, Derivative, Engine, Colour, Equipment) that isn't
  created here at all — `Vehicle.derivativeId` is deliberately absent from
  §4 until Plan 08's tables exist for it to reference; Plan 11 adds that
  foreign key when it extends `Vehicle`.
- **Plan 11 (Vehicle & Listing Data Model)** fills in everything the
  catalogue doc's §9–§11 describe (history, equipment, modifications) on
  top of the `Vehicle`/`Listing` stubs here.
- **Plan 12 (Image Processing)** extends `Media` with the image-category
  enum (`EXTERIOR`/`INTERIOR`/etc. from the stack doc §13) and the
  large/medium/thumbnail path fields.
- **Plan 25 (Messaging)** extends `Conversation`/`Message` with
  `conversation_members`, read receipts, and attachments.
- **Plan 13 (Search)** owns enabling the `pg_trgm` Postgres extension and
  any search-specific indexes — not created in this baseline migration.

## 8. Out of scope for this plan

- Full business fields for any entity beyond identity/relations — see §7
- Enabling `pg_trgm` or any search index → **Plan 13**
- Catalogue tables → **Plan 08**
- Analytics event table → **Plan 27**
- Backup automation of this database → **Plan 36** (this plan only
  produces the schema being backed up)

## 9. Acceptance criteria

- [x] `pnpm db:migrate:dev` against Local Postgres (from Plan 02) creates
      and applies an initial migration covering §4's models with no
      manual SQL editing required. Verified for real: migration
      `20260913193428_init` created and applied against local Docker
      Postgres.
- [x] `packages/db`'s exported `db` client is importable from `apps/api`
      and returns a real query result (e.g. `db.user.findMany()`).
      Verified for real (returned the seeded user, camelCase fields) and
      wired as an injectable Nest provider (`DbModule`/`DB` token) in both
      `apps/api` and `apps/worker`, per §11.
- [x] `pnpm db:seed` inserts exactly one test user, idempotently (running
      it twice doesn't duplicate or error). Verified for real: ran twice,
      same user id both times, one row in `users`.
- [x] `pnpm db:migrate:deploy` successfully applies the same migration
      against a Test-shaped Postgres instance (per Plan 02's environment
      definition), proving the Local→Test promotion path works. Test isn't
      provisioned yet (per the runbook), so this was verified against a
      fresh local database standing in for one: `migrate deploy` applied
      the same committed migration with no diffing, all six tables
      present.
- [x] Every table name and column name in the actual database is
      snake_case; every Prisma Client field accessed in TS is camelCase.
      Verified via `psql` (`display_name`, `owner_id`, `vehicle_id`, ...)
      against the generated client's camelCase fields.
- [x] `pnpm lint`/`typecheck`/`build` remain green with `packages/db`
      added as a new workspace package. Verified for real: `lint`/
      `typecheck` both green across all 15 tasks; `build` green across the
      4 packages that define one (`packages/db` has no `build` script,
      same as every other `packages/*`); `pnpm test` also green (15
      tasks, including the new `DbModule` tests in both `apps/api`/
      `apps/worker`).

## 10. Open questions for you — resolved 2026-09

1. **Confirmed multi-file Prisma schema** (§2) as originally proposed —
   "multi-file straight away."
2. **Confirmed status enum, not soft-delete**, as the default lifecycle
   pattern (§2) — "keep records for now and not delete, status change
   only. We'll decide later what to do with old data." No entity
   identified yet that needs true recoverable soft-delete; if one comes
   up, its owning plan decides then.
3. **No objection** — Better Auth stays the one thing allowed to extend
   `User` outside its "owning plan only" pattern (§7).

## 11. Deviations from this plan worth flagging

- **Prisma pinned at 6.19.3, not the newest major (8.x, an RC at time of
  writing)** — `import { PrismaClient } from "@prisma/client"` (§3's exact
  code) needs the client generated into `@prisma/client`'s own directory,
  which Prisma 7+ no longer supports without an explicit custom
  `output` path. 6.19.3 is the latest stable release still generating
  there by default, keeping the singleton wrapper exactly as designed.
- **A `prisma.config.ts` was added at the repo root** (not in the original
  plan) — needed for one thing only: pointing `migrations.path` at
  `prisma/migrations` (a sibling of `prisma/schema/`, per §3's tree).
  Without it, `prisma migrate dev --schema prisma/schema` nests migrations
  *inside* the schema folder instead (`prisma/schema/migrations/`),
  discovered by actually running it. `db:*` scripts (§5) now call the bare
  `prisma` subcommands with no `--schema` flag — the config file is the
  source of truth instead.
- **`@prisma/client` (and `prisma`) are also direct dependencies of the
  root `package.json`**, not only of `packages/db`. Under pnpm's strict
  linking, the root-level `db:*` scripts (which run `prisma generate`/
  `migrate`/etc. with the repo root as `cwd`) need `@prisma/client`
  resolvable from *there* too, or `prisma generate` falls back to
  auto-installing it and hits pnpm's `ERR_PNPM_ADDING_TO_ROOT` workspace
  guard (confirmed by hitting exactly that on the first `pnpm install`).
  `packages/db` stays the only place app code is meant to import
  `@prisma/client` from directly.
- **A root-level `postinstall` script (`prisma generate`) was added** — so
  every `pnpm install`, including inside `docker/api.Dockerfile`'s /
  `worker.Dockerfile`'s build stage (which run `pnpm install
  --frozen-lockfile` with no separate generate step after), always leaves
  a working generated client behind. `prisma`/`@prisma/client`'s own
  postinstall scripts (which fetch the query-engine binary) needed adding
  to `pnpm-workspace.yaml`'s `allowBuilds` for this to run at all under
  this repo's supply-chain-script policy (Plan 01).
- **`packages/db`'s own FK-column indexes go slightly beyond §4's literal
  code samples**: `vehicles.owner_id`, `listings.vehicle_id`/`seller_id`,
  `media.listing_id`, and `messages.sender_id` are all indexed, applying
  §6's "foreign keys are always indexed" rule to this plan's own baseline
  models, not just future ones.
- **`Listing.media`/`Vehicle.listings` back-relation fields were added**
  beyond §4's snippets — Prisma's schema validator requires both sides of
  an explicit relation to be declared (the `Media.listing`/`Listing.vehicle`
  side alone doesn't validate without it).
- **`DbModule`/`DB` injection token added in both `apps/api` and
  `apps/worker`** (`src/common/db/db.module.ts`, `@Global()`), closing the
  loop Plan 05 explicitly left open ("no Prisma client yet to inject
  \(Plan 06\)" — see `postgres-health.indicator.ts`'s own comment). Not
  wired into the existing health indicators themselves — that indicator's
  tests and behavior are Plan 05's, left untouched; a future plan can
  switch it to the shared client if it wants to.
- **`docs/deployment-runbook.md` updated** to replace its placeholder
  `pnpm db:migrate` with the real script names, and to run
  `db:migrate:deploy` as a one-off `docker compose run --rm api ...`
  container on Test/Production rather than from the bare host — `postgres`
  isn't published to the host there (no `ports:` entry), only reachable by
  service name from inside the Compose network.
