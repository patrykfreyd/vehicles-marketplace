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
(http://localhost:3001, health check at `/health`), `mobile` (Expo dev
server — press `w`/`i`/`a` or scan the QR code), and `worker` (a heartbeat
process, no HTTP) concurrently via Turborepo.

## Scripts

Run any of these from the repo root; Turborepo fans each one out to every
app/package that defines it (and skips the ones that don't):

| Script              | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm dev`          | Starts every app in dev/watch mode                                    |
| `pnpm build`        | Builds/typechecks every app and package                               |
| `pnpm lint`         | Runs ESLint everywhere                                                |
| `pnpm typecheck`    | Runs `tsc --noEmit` everywhere                                        |
| `pnpm test`         | Runs Vitest (web/api/worker/catalogue-cli/packages) and Jest (mobile) |
| `pnpm format`       | Formats the whole repo with Prettier                                  |
| `pnpm format:check` | Checks formatting without writing                                     |

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
docker/          Dockerfiles, compose fragments (Plan 02)
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

## What's deliberately not here yet

No database, no auth, no real UI, no Docker services — see §7 of the plan
for the full "in scope / out of scope" list and which later plan owns each
piece.
