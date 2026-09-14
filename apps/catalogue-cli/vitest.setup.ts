/**
 * Mirrors apps/worker/vitest.setup.ts's pattern: records whether real
 * Postgres was actually configured before anything (importer.test.ts's
 * `db.$transaction` calls, `@vehicles-marketplace/config`'s `loadEnv`
 * validation) has a chance to fail on a missing DATABASE_URL, so
 * DB-touching tests can skip gracefully on a machine with nothing running
 * locally instead of failing `pnpm test`.
 */
process.env.CATALOGUE_CLI_TEST_HAS_REAL_INFRA = String(Boolean(process.env.DATABASE_URL));

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/marketplace';
