/**
 * `DbModule` imports `db` from `@vehicles-marketplace/db`, which builds the
 * shared `PrismaClient` singleton at *import* time — and its constructor
 * validates `DATABASE_URL` against the schema's `env("DATABASE_URL")`
 * datasource right away. A schema-valid placeholder keeps every test that
 * doesn't need a live Postgres connection (most of this app's suite) from
 * failing just because `db.module.ts` got imported, mirroring
 * apps/worker/vitest.setup.ts's approach for the same reason.
 */
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/marketplace';
