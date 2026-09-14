/**
 * The one seam every app/module goes through to reach Postgres — the
 * shared client singleton plus every generated Prisma type, re-exported so
 * consumers never import `@prisma/client` directly (see
 * plans/06-database-schema-migrations-baseline.md §2).
 */
export { db } from './client';
export * from '@prisma/client';
