/**
 * The one `PrismaClient` instance for the whole process — every app/module
 * imports `db` from here instead of `new PrismaClient()`ing its own (that
 * would open a separate connection pool per import site) or importing
 * `@prisma/client` directly (couples every consumer to Prisma's raw API
 * instead of this one seam). See
 * plans/06-database-schema-migrations-baseline.md §2 "Client access
 * pattern"/"Connection strategy".
 *
 * `api`/`worker` are long-running Node processes (not serverless
 * functions), so one client per process for the life of that process is
 * all this needs — no Data Proxy/pgbouncer complexity at this stage.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Guards against duplicate clients when `apps/api`/`apps/worker`'s
// `node --watch` hot-reloads their entry module outside production.
export const db = globalThis.__prisma ?? new PrismaClient();
if (process.env.APP_ENV !== 'production') globalThis.__prisma = db;
