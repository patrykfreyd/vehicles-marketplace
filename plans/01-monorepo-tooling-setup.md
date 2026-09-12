# Plan 01 — Monorepo & Tooling Setup

Status: Draft
Depends on: nothing (this is the first plan)
Blocks: every other plan — all of them assume this repo layout, these
package names, and these shared configs exist.

## 1. Objective

Stand up the empty monorepo skeleton — folder structure, workspace tooling,
shared TypeScript/lint/format config, and dev scripts — so that every
subsequent plan (auth, catalogue, search, etc.) has a consistent place to
land code and doesn't reinvent build/lint/test wiring per app.

This plan produces **structure and configuration only**. No business logic,
no database, no UI. "Done" means `pnpm install && pnpm dev` boots empty
Next.js, NestJS and Expo apps side by side, sharing at least one real
imported type from a shared package, with lint/format/typecheck all green.

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md`

These aren't re-litigated here — they're inputs to this plan:

- Language: TypeScript everywhere (web, api, worker, mobile, catalogue CLI)
- Package manager / task runner: **pnpm + Turborepo**
- Apps: `web` (Next.js), `mobile` (Expo/React Native), `api` (NestJS),
  `worker` (NestJS, shares source with `api`), `catalogue-cli` (Node/TS)
- Repo also owns `catalogue/` (JSON staging data) and `prisma/` (schema +
  migrations) as top-level, non-`apps`/`packages` directories

## 3. New decisions this plan needs to fix

| Decision | Choice | Rationale |
|---|---|---|
| Node.js version | **22.x LTS**, pinned via `.nvmrc` + `package.json engines` | Active LTS, supported well past this project's V1 horizon |
| TypeScript version | Latest stable 5.x, pinned exact (no `^`) at the workspace root | Avoids silent compiler-behavior drift across packages |
| Linting | **ESLint** (flat config) with `@typescript-eslint`, shared via `packages/eslint-config` | One rule set for web/api/mobile, overridable per app |
| Formatting | **Prettier**, shared via `packages/prettier-config` | Keep formatting out of ESLint's job |
| Git hooks | **Husky + lint-staged** | Fast, well-understood, no server dependency |
| Commit style | Conventional Commits, enforced by **commitlint** (warn-only initially) | Cheap now, enables changelogs/automation later without blocking early velocity |
| Module packaging | Internal packages are **TypeScript-source-only** (no build step), consumed via `tsconfig` path aliases + Turborepo, not compiled to `dist` | Simplest option for an app-only monorepo (we're not publishing packages externally) |
| Testing runner | **Vitest** for `packages/*` and `apps/api`/`apps/worker`; **Jest** (via `jest-expo`) for `apps/mobile`; Next.js uses Vitest too | Matches each framework's supported default rather than fighting one runner into all three |

Flag for you to confirm before we scaffold: Node 22 and Vitest-over-Jest for
the non-mobile apps are the two choices most likely worth a second look —
say now if you'd rather standardize on Jest everywhere for one mental model
instead of the "best fit per app" approach above.

## 4. Repository structure

```text
vehicles-marketplace/
│
├── apps/
│   ├── web/                 # Next.js — buyer + seller web app
│   ├── mobile/               # Expo/React Native — buyer + seller app
│   ├── api/                  # NestJS — REST API (modular monolith)
│   ├── worker/                # BullMQ workers; shares source with api
│   └── catalogue-cli/          # Node/TS catalogue import/validate tooling
│
├── packages/
│   ├── types/                # Shared domain TS types
│   ├── validation/            # Shared Zod schemas (source of truth)
│   ├── api-client/             # Generated TS client for web + mobile
│   ├── design-tokens/           # Colors/spacing/typography, light+dark
│   ├── ui-web/                  # Shared React components (web)
│   ├── ui-mobile/                # Shared React Native components
│   ├── catalogue-types/           # Catalogue-specific shared types
│   ├── analytics-types/            # Event name/schema package (Plan 27)
│   ├── config/                      # Runtime config loader/validator
│   ├── eslint-config/                # Shared flat ESLint config
│   ├── prettier-config/               # Shared Prettier config
│   ├── tsconfig/                       # Shared base tsconfig(s)
│   └── utils/                           # Small cross-app helpers
│
├── catalogue/                # JSON staging data (Plan 08/09)
│   └── schema/
│
├── prisma/                   # Prisma schema + migrations (Plan 06)
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docker/                   # Dockerfiles, compose fragments (Plan 02)
├── idea/                     # Existing product idea docs (already present)
├── plans/                    # This plan series
│
├── .github/workflows/         # CI (minimal here; full pipeline is Plan 35)
├── .husky/
├── .nvmrc
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
└── README.md
```

Notes:

- `packages/ui-web` and `packages/ui-mobile` stay separate (React DOM vs
  React Native render targets can't share components), but both import
  `design-tokens` so light/dark theming stays visually consistent — this is
  the package Plan 04 (Design System) builds on top of.
- `apps/worker` intentionally shares source with `apps/api` rather than
  living in `packages/`, per the low-cost-stack doc — it's a deployable
  process, not a library.
- Only scaffold packages this plan actually needs as **empty, buildable
  shells** (see §7). Packages tied to a specific later plan (e.g.
  `analytics-types`) get their real content when that plan starts, not now
  — this plan just reserves the name/location so nothing later has to
  restructure the tree.

## 5. Workspace & task-runner config

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json` — minimal pipeline, extended by later plans as real
build/test/lint scripts appear:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## 6. Shared TypeScript config

`packages/tsconfig/base.json` holds strict compiler defaults (`strict: true`,
`noUncheckedIndexedAccess: true`, `moduleResolution: bundler`, etc.). Each
app/package's own `tsconfig.json` extends it and adds only what its runtime
needs (e.g. `apps/mobile` adds `jsx: react-native`, `apps/web` relies on
Next.js's own tsconfig plugin layered on top of the base).

Internal packages are referenced via TS path aliases (e.g.
`@vehicles-marketplace/validation`) configured once in the base config, so
`apps/web`, `apps/api`, and `apps/mobile` all resolve them identically
without a compile step.

## 7. What gets scaffolded in this plan (and what doesn't)

**In scope — created as empty/near-empty shells:**

- All five `apps/*` — each boots to a trivial "it's alive" screen/endpoint
  (Next.js default page, NestJS with one health-check controller, Expo
  default router screen). No auth, no DB, no real UI yet.
- `packages/types`, `packages/validation`, `packages/config`,
  `packages/utils`, `packages/tsconfig`, `packages/eslint-config`,
  `packages/prettier-config` — populated with one real, trivial example each
  (e.g. `validation` exports one `HealthCheckSchema` used by `api` and
  `web`) so we prove cross-package imports actually work end-to-end, not
  just on paper.
- `packages/design-tokens`, `packages/ui-web`, `packages/ui-mobile`,
  `packages/api-client`, `packages/catalogue-types`,
  `packages/analytics-types` — directory + `package.json` + empty
  `index.ts` only. Real content belongs to Plans 04, 05, 08, 27.

**Explicitly out of scope for this plan** (owned by later plans, listed so
nothing gets duplicated):

- Docker Compose services, environment variable contract → **Plan 02**
- Real Zod domain schemas → **Plan 03**
- Theme tokens, toast system, inline-validation pattern → **Plan 04**
- NestJS module structure, OpenAPI, generated client content → **Plan 05**
- Prisma schema content, migrations → **Plan 06**
- Full CI/CD pipeline (build→Test→Production) → **Plan 35**; this plan adds
  only a minimal PR check (install, lint, typecheck, build) so breakage is
  caught immediately while Plan 35 designs deployment.

## 8. Lint, format, and commit hooks

- ESLint flat config in `packages/eslint-config`, split into a base ruleset
  plus small overrides per app type (`node`, `react`, `react-native`).
- Prettier config in `packages/prettier-config`; no conflicting rules kept
  in ESLint (`eslint-config-prettier` disables stylistic overlap).
- Husky pre-commit → `lint-staged` runs Prettier + ESLint `--fix` only on
  staged files.
- commitlint on `commit-msg` hook, Conventional Commits, **warn-only** for
  now (`--verbose`, non-blocking) so it doesn't slow down solo early
  development; can be flipped to blocking once the team grows.

## 9. Environment & secrets convention (structure only — Plan 02 owns behavior)

- `.env.example` at the repo root lists every variable name the system will
  ever need, with placeholder values and comments — kept accurate by every
  later plan that introduces a new variable.
- `.env.local` (gitignored) for local overrides.
- No real secrets committed, ever — enforced later by a pre-commit secret
  scan if needed (candidate addition to Plan 38, not this one).

## 10. Acceptance criteria

- [ ] `pnpm install` succeeds from a clean clone with no manual steps.
- [ ] `pnpm dev` starts `web`, `api`, and `mobile` (mobile via Expo dev
      server) concurrently without port conflicts.
- [ ] `apps/web` renders a page that calls a function imported from
      `packages/validation`.
- [ ] `apps/api` exposes `GET /health` returning a payload validated against
      a shared schema from `packages/validation`.
- [ ] `apps/mobile` boots in Expo Go / simulator to a placeholder screen.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` all pass with zero errors
      across every app and package.
- [ ] A commit with a lint violation is auto-fixed or blocked by the
      pre-commit hook as appropriate.
- [ ] A minimal GitHub Actions workflow runs install/lint/typecheck/build on
      every PR and reports status.
- [ ] `README.md` documents: prerequisites (Node version, pnpm version),
      first-time setup, and the full script list from §5.

## 11. Open questions for you

1. Confirm Node 22 LTS and the Vitest/Jest split in §3, or tell me your
   preference.
2. Package scope/name prefix for internal packages — proposed
   `@vehicles-marketplace/*` (e.g. `@vehicles-marketplace/validation`).
   Fine, or do you want a shorter prefix (e.g. `@dh/*` for DriveHub)?
3. Should the commitlint hook stay warn-only indefinitely, or do you want it
   blocking from day one?

Once these are confirmed, scaffolding this plan is a mechanical step and we
can move straight to Plan 02 (Environments & Infrastructure).
