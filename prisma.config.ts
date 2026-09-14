/**
 * Prisma 6's config file — the modern replacement for CLI `--schema` flags.
 * Needed for exactly one thing here: pointing `migrations/` at
 * `prisma/migrations` (a sibling of `prisma/schema/`, per
 * plans/06-database-schema-migrations-baseline.md §3) instead of Prisma's
 * default of nesting it inside the schema folder itself
 * (`prisma/schema/migrations/`) when the schema is a directory.
 *
 * No `datasource`/`engine` override here — the schema's own
 * `env("DATABASE_URL")` in prisma/schema/schema.prisma stays the one
 * source of truth for the connection string.
 */
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
});
