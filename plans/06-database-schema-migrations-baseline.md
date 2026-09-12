# Plan 06 — Database Schema & Migrations Baseline

Status: Draft
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

- [ ] `pnpm db:migrate:dev` against Local Postgres (from Plan 02) creates
      and applies an initial migration covering §4's models with no
      manual SQL editing required.
- [ ] `packages/db`'s exported `db` client is importable from `apps/api`
      and returns a real query result (e.g. `db.user.findMany()`).
- [ ] `pnpm db:seed` inserts exactly one test user, idempotently (running
      it twice doesn't duplicate or error).
- [ ] `pnpm db:migrate:deploy` successfully applies the same migration
      against a Test-shaped Postgres instance (per Plan 02's environment
      definition), proving the Local→Test promotion path works.
- [ ] Every table name and column name in the actual database is
      snake_case; every Prisma Client field accessed in TS is camelCase.
- [ ] `pnpm lint`/`typecheck`/`build` remain green with `packages/db`
      added as a new workspace package.

## 10. Open questions for you

1. Confirm the multi-file Prisma schema approach (§2) — worth the small
   extra setup now given how many plans will add models, or would you
   rather keep one `schema.prisma` file until it actually becomes
   unwieldy?
2. Confirm "status enum instead of soft-delete" as the default lifecycle
   pattern (§2) — any entity you already know needs true soft-delete
   (recoverable within N days) rather than a status field?
3. Any objection to Better Auth being the one thing allowed to extend
   `User` outside its "owning plan only" pattern, given it's a third-party
   library with its own schema requirements (§7)?
