/**
 * `DbModule` imports `db` from `@vehicles-marketplace/db`, which builds the
 * shared `PrismaClient` singleton at *import* time — and its constructor
 * validates `DATABASE_URL` against the schema's `env("DATABASE_URL")`
 * datasource right away. A schema-valid placeholder keeps every test that
 * doesn't need a live Postgres connection (most of this app's suite) from
 * failing just because `db.module.ts` got imported, mirroring
 * apps/worker/vitest.setup.ts's approach for the same reason.
 *
 * Recorded *before* the placeholder default below is applied —
 * `CatalogueAdminService`/`CatalogueService` (Plan 09) run real queries
 * against Postgres, and their tests read this (mirroring
 * `WORKER_TEST_HAS_REAL_INFRA`) to skip gracefully instead of failing when
 * nothing real is actually configured.
 */
process.env.API_TEST_HAS_REAL_DB = String(Boolean(process.env.DATABASE_URL));

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/marketplace';
