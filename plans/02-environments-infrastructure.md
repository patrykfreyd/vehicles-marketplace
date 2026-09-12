# Plan 02 — Environments & Infrastructure

Status: Implemented (Local); Test/Production deliberately not provisioned
yet — see §9 and §11
Depends on: Plan 01 (repo structure, `docker/` and root files already exist
as placeholders)
Blocks: Plan 05 (API needs `DATABASE_URL`/`REDIS_URL` conventions), Plan 06
(migrations need a real Postgres to run against), Plan 35 (CI/CD promotes
into the environments this plan defines), Plan 36 (backups back up what
this plan lays out)

## 1. Objective

Stand up the **Local, Test, and Production** environment definitions —
Docker Compose services, reverse proxy config, the environment-variable
contract, and the on-disk data layout — so every later plan has a real place
to run against instead of assuming one. This plan produces infrastructure
scaffolding and documentation, not application features.

"Done" means: `docker compose --env-file .env.local up -d` brings up
Postgres + Redis + Caddy locally against the placeholder apps from Plan 01,
and the Test/Production Compose files + Caddyfiles + deployment runbook
exist and are documented, even if the actual Test/Production VPS purchase
happens later (see §9).

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md`

- Three environments: **Local, Test, Production** — same code, same Docker
  images, different config/secrets only (no environment-specific branches).
- One-server architecture per deployed environment: Caddy → {Next.js, NestJS
  API} → {Postgres, Redis, Worker}, images stored on local disk.
- Reverse proxy / TLS: **Caddy** (automatic HTTPS), not Nginx+Certbot.
- Database: **Postgres**, self-hosted in Docker, not a managed service, for
  V1.
- Queue: **Redis + BullMQ**, self-hosted in Docker.
- Image storage: local filesystem under `/data/uploads`, behind a
  `StorageService` abstraction (implemented in Plan 12) so it can move to S3
  later without touching business logic.
- `APP_ENV` (`local` | `test` | `production`) is the explicit environment
  discriminator — never rely on `NODE_ENV` alone.
- Explicit `/data` directory tree per host (`postgres/`, `uploads/`,
  `backups/`, `catalogue/`) — no reliance on anonymous Docker volumes for
  anything that must survive a container replace.
- Migrations and catalogue promotion both flow **Local → Test → Production**
  using the same artifact/commit, never re-built independently per
  environment.
- External-from-day-one dependencies (kept outside the VPS): domain/DNS,
  transactional email, AI APIs, off-site backup destination, app stores.
  Everything else runs on the VPS.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Status |
|---|---|---|
| VPS provider | Any mainstream provider with hourly/monthly billing and snapshotting (e.g. Hetzner, DigitalOcean, OVH) | **Decided** — OVH, VPS-2 tier, for both Test and Production (§11.1) |
| Domain name | — | **Deferred** — `example.co.uk` stays as the placeholder throughout the repo until a real domain is chosen (§11.2) |
| Production server spec | 4 vCPU / 8 GB RAM / 100–200 GB SSD, per the stack doc | Proposed, confirm cost tolerance once OVH's VPS-2 spec is checked against this |
| Test server spec | Smaller than Production (e.g. 2 vCPU / 4 GB RAM) is acceptable | Proposed |
| When to actually provision Test/Production VPS | Provision **Test** once Plan 05/06 land something worth deploying; provision **Production** only once every dev plan is implemented (stronger than the original "shortly before launch") | **Decided** (§11.3) — see §9 |
| Off-site backup destination | Deferred to **Plan 36** — this plan only reserves the `/data/backups` local staging directory and the env vars for a destination | Deferred |
| Email provider | Deferred to **Plan 07/24** (first real consumer of transactional email) — this plan only reserves `EMAIL_API_KEY`/`EMAIL_FROM` | Deferred |
| AI provider | Deferred to whichever plan first calls it (Plan 14 AI Search) — this plan only reserves `AI_API_KEY` | Deferred |

## 4. Directory & file additions (on top of Plan 01's tree)

```text
docker/
├── web.Dockerfile
├── api.Dockerfile
├── worker.Dockerfile
├── Caddyfile.local
├── Caddyfile.test
└── Caddyfile.production

docker-compose.yml               # shared service definitions
docker-compose.local.yml          # local overrides (bind mounts, hot reload)
docker-compose.test.yml            # test overrides
docker-compose.production.yml       # production overrides

.env.example                        # every variable name, placeholder values
.env.local                           # gitignored — real local values

docs/
└── deployment-runbook.md              # manual promotion steps (until Plan 35 automates them)
```

On each deployed host (Test, Production — not Local):

```text
/data/
├── postgres/      # Postgres data directory (bind-mounted volume)
├── uploads/       # StorageService local files, listings/<id>/{original,large,medium,thumbnail}
├── backups/       # local staging before off-site sync (Plan 36 owns the sync job)
└── catalogue/     # working directory for catalogue import runs, if needed on-host
```

## 5. Environment variable contract

`.env.example` is the single source of truth for variable **names**; every
plan that introduces a new variable must add it here. Baseline set for this
plan:

```text
# App identity
NODE_ENV=production
APP_ENV=local            # local | test | production
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database & cache
DATABASE_URL=postgresql://user:pass@localhost:5432/marketplace
REDIS_URL=redis://localhost:6379

# Storage
UPLOAD_ROOT=/data/uploads
PUBLIC_UPLOAD_URL=http://localhost:3001/uploads

# Auth (real values defined in Plan 07)
AUTH_SECRET=

# External services (real values defined in the plan that first uses them)
EMAIL_API_KEY=
EMAIL_FROM=
AI_API_KEY=
DVLA_API_KEY=
```

Rules (carried from the idea doc, restated as policy):

- No real secrets ever committed. `.env.local` is gitignored.
- Test and Production secrets are deployed via the host/CI secret store
  defined in Plan 35, never via a committed file.
- Every environment has **fully separate** Postgres, Redis, and uploads —
  no shared writable state between Local/Test/Production, ever.

## 6. Docker Compose service definitions

`docker-compose.yml` (shared base, environment files layer config on top):

```yaml
services:
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    restart: unless-stopped
    depends_on: [api]

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    restart: unless-stopped
    depends_on: [postgres, redis]

  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    restart: unless-stopped
    depends_on: [postgres, redis]

  postgres:
    image: postgres:17
    restart: unless-stopped
    volumes:
      - /data/postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  caddy:
    image: caddy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./docker/Caddyfile.${APP_ENV}:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  caddy_data:
```

`docker-compose.local.yml` differs from Test/Production mainly by bind-
mounting source for hot reload and skipping Caddy in favor of direct
`localhost:3000` / `localhost:3001` access during active development (Caddy
optional locally, per the stack doc).

Example `Caddyfile.production`:

```text
example.co.uk {
    reverse_proxy web:3000
}

api.example.co.uk {
    reverse_proxy api:3001
}
```

`Caddyfile.test` follows the same shape against `test.example.co.uk` /
`api.test.example.co.uk` (placeholder domain — see §11).

## 7. Local development flow

Two supported modes, both valid, developer's choice per the stack doc:

1. **Full Docker**: `docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d` — closest to Test/Production.
2. **Hybrid**: Postgres + Redis in Docker, `web`/`api`/`worker` run directly
   via `pnpm dev` (from Plan 01) for faster hot reload.

Either way, local Postgres/Redis/uploads are strictly local-only, seeded via
`pnpm db:migrate && pnpm db:seed` (real seed content defined in Plan 06).

## 8. Deployment promotion flow (manual for now)

```text
Developer → LOCAL
    ↓ commit / PR merge
TEST (deploy manually via docs/deployment-runbook.md for now)
    ↓ validate
PRODUCTION (manual, approved) — same build artifact that passed Test
```

This plan documents the **manual** version of this flow
(`docs/deployment-runbook.md`: SSH in, `git pull`, `docker compose build`,
`docker compose up -d`, run pending migrations). Automating it via GitHub
Actions is explicitly **Plan 35**'s job — we don't want to design CI/CD
twice.

## 9. Provisioning sequencing (cost control)

To avoid paying for infrastructure before there's anything worth deploying:

1. **Now**: build and validate everything against Local only.
2. **Before Plan 05/06 need a real deploy target**: provision the Test VPS
   (OVH VPS-2), point `test.<domain>` at it, deploy manually per §8.
3. **Only once every dev plan in `plans/00-dev-plans-index.md` is
   implemented and validated on Test**: provision Production (OVH VPS-2),
   following the identical Compose/Caddy pattern validated on Test. This is
   a deliberately later trigger than "shortly before real launch" — decided
   2026-09.

This plan defines the *shape* of Test/Production now so there's no
redesign later — it doesn't require buying servers today. Current
provisioning status lives in
[`docs/deployment-runbook.md`](../docs/deployment-runbook.md) ("Current
status"), not here, so it doesn't go stale as the project progresses.

## 10. Out of scope for this plan (owned elsewhere)

- Backup automation and off-site sync → **Plan 36**
- CI/CD automation of the promotion flow above → **Plan 35**
- Real secret *values* for auth/email/AI/DVLA → **Plans 07, 24, 14, 10**
  respectively (this plan only reserves the variable names)
- Application-level config validation (e.g. failing fast on a missing env
  var) → **Plan 03/05** (`packages/config`)
- Monitoring/uptime/disk alerts → candidate addition to Plan 35 or a future
  ops plan; not designed here

## 11. Open questions for you — resolved 2026-09

1. **VPS provider** — **OVH, VPS-2 tier**, for both Test and Production.
   The runbook's commands stay plain Ubuntu + Docker regardless, so this
   isn't load-bearing if it changes later.
2. **Domain name** — left as the `example.co.uk` placeholder for now;
   replace it repo-wide (Caddyfiles + this plan + the runbook) once a real
   domain is chosen.
3. Provisioning sequencing — confirmed, and pushed further than originally
   proposed: Test provisions when Plan 05/06 need a real deploy target
   (unchanged), but **Production now waits until every dev plan is
   implemented**, not just "shortly before launch." See §9.

## 12. Acceptance criteria

- [x] `docker-compose.yml` + `docker-compose.local.yml` bring up
      `postgres`, `redis`, and (once Plan 01's placeholder apps exist)
      `web`/`api`/`worker` locally with one command.
- [x] `.env.example` contains every variable in §5, with comments, and no
      real values.
- [x] `docker-compose.test.yml` / `docker-compose.production.yml` and their
      Caddyfiles exist and follow the identical service shape as Local,
      differing only via env file and domain.
- [x] `/data` layout (§4) is documented in the runbook, including which
      paths must be bind-mounted (never anonymous volumes).
- [x] `docs/deployment-runbook.md` describes the manual Local→Test→
      Production promotion flow step by step.
- [x] A README section explains `APP_ENV` vs `NODE_ENV` and states plainly:
      never point Local or Test at Production's database, Redis, or
      uploads.
