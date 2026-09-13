# Vehicles Marketplace

A pnpm + Turborepo monorepo: `web` (Next.js), `mobile` (Expo/React Native),
`api` (NestJS), `worker` (NestJS, shares source with `api`), and
`catalogue-cli` (Node/TS), plus a set of shared `packages/*`.

This is the skeleton produced by
[`plans/01-monorepo-tooling-setup.md`](plans/01-monorepo-tooling-setup.md) —
structure and tooling only, no business logic yet. See that file for the
decisions behind the choices below, and `plans/00-dev-plans-index.md` for
what every later plan owns.

## Prerequisites

- **Node.js 22.x** — the version pinned in [`.nvmrc`](.nvmrc). If you use
  `nvm`, run `nvm use`.
- **pnpm**, via [Corepack](https://nodejs.org/api/corepack.html) (ships with
  Node): run `corepack enable` once, then pnpm resolves automatically to the
  version pinned in `package.json`'s `packageManager` field.

## First-time setup

```sh
corepack enable        # once per machine
nvm use                # or otherwise switch to Node 22
pnpm install
cp .env.example .env.local   # fill in real values as later plans need them
pnpm dev
```

`pnpm dev` starts `web` (http://localhost:3000), `api`
(http://localhost:3001 — health check at `/api/v1/health`, Swagger UI at
`/api/docs`), `mobile` (Expo dev server — press `w`/`i`/`a` or scan the QR
code), and `worker` (a BullMQ queue-consumer process, no HTTP) concurrently
via Turborepo. `api`/`worker` need Postgres and Redis reachable to boot —
see the Hybrid/Full-Docker commands under [Environments](#environments)
below.

This is the "Hybrid" local mode — see [Environments](#environments) below
for Postgres/Redis (needed once Plan 06 lands) and the alternative "Full
Docker" mode.

## Environments

Three environments — **Local**, **Test**, **Production** — same code, same
Docker images, different config/secrets only. Docker Compose services,
reverse proxy config, the `/data` layout, and the full deployment runbook
are defined in
[`plans/02-environments-infrastructure.md`](plans/02-environments-infrastructure.md)
and [`docs/deployment-runbook.md`](docs/deployment-runbook.md) — Test and
Production aren't provisioned yet (see the runbook's "Current status"),
but Local is fully usable now:

```sh
# Hybrid (recommended): Postgres/Redis in Docker, apps via `pnpm dev`
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d postgres redis
pnpm dev

# Full Docker: everything in containers
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d
```

**`APP_ENV` vs `NODE_ENV`**: `APP_ENV` (`local` | `test` | `production`) is
this project's own environment discriminator — application code should
branch on this, never on `NODE_ENV` alone. `NODE_ENV` controls
Node/Next.js's own dev-vs-production behavior and is set automatically by
each Docker image target — you don't need to set it by hand. Both are
documented in [`.env.example`](.env.example).

**Never** point Local or Test's database, Redis, or file uploads at
Production's — every environment has fully separate data, always (see
§6 of the runbook).

## Scripts

Run any of these from the repo root; Turborepo fans each one out to every
app/package that defines it (and skips the ones that don't):

| Script                     | What it does                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                 | Starts every app in dev/watch mode                                                                                                                                                                   |
| `pnpm build`               | Builds/typechecks every app and package                                                                                                                                                              |
| `pnpm lint`                | Runs ESLint everywhere                                                                                                                                                                               |
| `pnpm typecheck`           | Runs `tsc --noEmit` everywhere                                                                                                                                                                       |
| `pnpm test`                | Runs Vitest (web/api/worker/catalogue-cli/packages) and Jest (mobile)                                                                                                                                |
| `pnpm generate:api-client` | Regenerates `packages/api-client` from `apps/api`'s live routes (see [`plans/05-backend-api-foundation.md`](plans/05-backend-api-foundation.md) §7) — run after changing a Zod schema or an endpoint |
| `pnpm format`              | Formats the whole repo with Prettier                                                                                                                                                                 |
| `pnpm format:check`        | Checks formatting without writing                                                                                                                                                                    |

A pre-commit hook (Husky + lint-staged) auto-fixes lint/format issues on
staged files; a commit-msg hook checks Conventional Commits and warns
without blocking (see §8 of the plan for why, and when to flip that).

## Repository layout

```text
apps/            web, mobile, api, worker, catalogue-cli
packages/        shared types, validation, config, utils, design-tokens,
                 ui-web, ui-mobile, api-client, catalogue-types,
                 analytics-types, eslint-config, prettier-config, tsconfig
catalogue/       JSON staging data (Plan 08/09)
prisma/          Prisma schema + migrations (Plan 06)
docker/          Dockerfiles, Caddyfiles (Plan 02)
docs/            deployment-runbook.md (Plan 02)
```

## How internal packages are consumed (no build step)

Every `packages/*` package ships raw TypeScript source from `src/index.ts`
— there's no compile step and nothing gets published. Two things make that
work at runtime:

1. **pnpm workspace symlinks** — any app that lists e.g.
   `"@vehicles-marketplace/validation": "workspace:*"` gets a real symlink
   in its `node_modules`, and that package's `package.json` `main`/`exports`
   point straight at `./src/index.ts`. Plain Node module resolution finds it
   like any other dependency.
2. **Each runtime already speaks TypeScript directly**, so a `.ts` file
   reached through that symlink still gets transformed:
   - `apps/web` (Next.js) — via `transpilePackages` in `next.config.ts`.
   - `apps/mobile` (Expo/Metro) — Metro bundles any source it's pointed at;
     `metro.config.js` just teaches it to follow pnpm's symlinks.
   - `apps/api`, `apps/worker`, `apps/catalogue-cli` — run via
     `node -r ts-node/register`, not a pre-built `dist/`. This is also why
     they use `ts-node` rather than an esbuild-based runner (`tsx`,
     `esbuild-register`): NestJS's DI relies on `emitDecoratorMetadata`,
     which esbuild's TS transform doesn't emit — ts-node's does.
   - Vitest picks up the shared path aliases via `vite-tsconfig-paths`;
     Jest (mobile) uses `moduleNameMapper` instead, since it doesn't read
     `tsconfig.json`.

The shared `@vehicles-marketplace/*` path alias itself is configured once,
in [`packages/tsconfig/base.json`](packages/tsconfig/base.json).

## Shared types & validation

`packages/types` and `packages/validation` hold the cross-cutting
conventions and primitives every later plan's domain schemas build on —
naming/casing rules, the entity ID strategy, the shared API error contract,
and schema-authoring conventions. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`plans/03-shared-types-validation.md`](plans/03-shared-types-validation.md).

## What's deliberately not here yet

No real database content, no auth, no real UI — see §7 of
[Plan 01](plans/01-monorepo-tooling-setup.md) and §10 of
[Plan 02](plans/02-environments-infrastructure.md) for the full "in scope /
out of scope" list and which later plan owns each piece.
