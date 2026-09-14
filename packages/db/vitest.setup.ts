/**
 * `packages/db/src/client.ts` builds the shared `PrismaClient` singleton at
 * *import* time, and the constructor validates `DATABASE_URL` against the
 * schema's `env("DATABASE_URL")` datasource right away — before any test's
 * own logic runs. A schema-valid placeholder keeps every test that doesn't
 * need a live Postgres connection from failing just on import, mirroring
 * apps/worker/vitest.setup.ts's approach for the same reason.
 */
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/marketplace';
