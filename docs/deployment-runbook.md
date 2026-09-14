# Deployment Runbook

Manual promotion steps for Local → Test → Production, per
[`plans/02-environments-infrastructure.md`](../plans/02-environments-infrastructure.md).
Automating this via GitHub Actions is Plan 35's job — this document is the
manual version it will eventually replace.

## Current status

- **Local**: fully usable now (§1 below).
- **Test**: not provisioned yet. Provisioning is deferred until Plan 05/06
  land something worth deploying (a real API + database to validate
  against) — see §2.
- **Production**: not provisioned yet, and deliberately deferred further
  than Test — the decision (2026-09) is to provision Production only once
  every plan in [`plans/00-dev-plans-index.md`](../plans/00-dev-plans-index.md)
  is implemented, not just "shortly before launch" as originally proposed.
  See §3.
- **VPS provider**: [OVH](https://www.ovhcloud.com/), VPS-2 tier, for both
  Test and Production when the time comes. Every command below is plain
  Ubuntu + Docker and works unchanged on any provider if that ever changes.
- **Domain**: `example.co.uk` is a placeholder throughout this repo
  (Caddyfiles, this document). Replace every occurrence with the real
  domain when one is chosen — search the repo for `example.co.uk` to find
  them all.

## 1. Local

Two supported modes — pick whichever fits what you're doing:

### Hybrid (recommended for day-to-day dev)

Postgres + Redis in Docker, `web`/`api`/`worker` run directly on the host
via `pnpm dev` for the fastest hot reload:

```sh
cp .env.example .env.local   # first time only; fill in real values as later plans need them
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d postgres redis
pnpm dev
```

### Full Docker (closest to Test/Production)

Everything — including `web`/`api`/`worker` — runs in containers:

```sh
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d
```

Add `--profile proxy` to also start Caddy and go through the reverse proxy
at `http://localhost` / `http://api.localhost` instead of hitting
`web`/`api` directly on their published ports.

Either way, run migrations/seed once Postgres is up:

```sh
pnpm db:migrate:dev && pnpm db:seed
```

`db:migrate:dev` is Local-only — it can create a new migration from a
schema change as well as apply existing ones, which needs interactive
shadow-database support `migrate deploy` deliberately doesn't have. Test
and Production only ever run migrations that were already created and
committed locally (§2.2 below).

**Important**: in Full Docker mode, `DATABASE_URL`/`REDIS_URL` in
`.env.local` need `postgres`/`redis` as the hostname (the Docker service
names), not `localhost` — see the comments in `.env.example`. Switch the
hostname back to `localhost` when going back to Hybrid mode.

Only each app's own `apps/<name>` directory is bind-mounted in Full Docker
mode, not the whole repo (see the comments in `docker-compose.local.yml`
for why: pnpm's workspace symlinks don't survive being bind-mounted from a
Windows/macOS host into the Linux container). That means editing a shared
`packages/*` file isn't picked up live — rebuild the image
(`docker compose ... build <service>`) to pick it up. On top of that,
`node --watch` (used by `api`/`worker` for hot reload) has been observed to
not fire automatically on every Docker Desktop file-sharing backend even
though the bind-mounted file content updates correctly — if a saved change
to `apps/api`/`apps/worker` doesn't seem to take effect, confirm with
`docker compose ... restart api` (or `worker`) rather than assuming the
mount is broken. This is one more reason Hybrid mode is the recommended
default for day-to-day iteration; Full Docker mode is for validating the
container shape, not fast iteration.

Bring everything down with `docker compose -f docker-compose.yml -f docker-compose.local.yml down` (add `-v` to also drop the anonymous
`node_modules` volumes, e.g. after a dependency change).

## 2. Test

**Not provisioned yet.** These are the steps to follow once it's time —
i.e. once Plan 05 (Backend API Foundation) and Plan 06 (Database Schema &
Migrations Baseline) have landed something real to deploy.

### 2.1 Provision the server

1. Create an OVH VPS-2 instance, Ubuntu Server (latest LTS).
2. Point `test.<domain>` and `api.test.<domain>` DNS records at its IP.
3. SSH in and install Docker Engine + the Compose plugin
   ([official install steps](https://docs.docker.com/engine/install/ubuntu/)).
4. Create the persistent data directories (§4):

   ```sh
   sudo mkdir -p /data/postgres /data/uploads /data/backups /data/catalogue
   ```

5. Clone the repo into a deployment directory, e.g. `/opt/vehicles-marketplace`:

   ```sh
   git clone <repo-url> /opt/vehicles-marketplace
   cd /opt/vehicles-marketplace
   ```

6. Create `.env` in that directory (**not** `.env.local` — see
   [`.env.example`](../.env.example)) with Test's real values:
   `APP_ENV=test`, its own `AUTH_SECRET`, its own database credentials,
   `DATABASE_URL`/`REDIS_URL` pointed at the `postgres`/`redis` service
   names, and Test/sandbox values for `EMAIL_API_KEY`/`AI_API_KEY`/
   `DVLA_API_KEY` where the providers that own those keys (Plans 07, 24, 14, 10) support a sandbox mode. This file is never committed — deploying it
   securely via CI is Plan 35's job; for now, create/edit it by hand over
   SSH.
7. Replace the placeholder domain in
   [`docker/Caddyfile.test`](../docker/Caddyfile.test) with the real one, if
   it wasn't already updated repo-wide.

### 2.2 Deploy

```sh
cd /opt/vehicles-marketplace
git pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.test.yml build
docker compose --env-file .env -f docker-compose.yml -f docker-compose.test.yml up -d
docker compose --env-file .env -f docker-compose.yml -f docker-compose.test.yml run --rm api pnpm db:migrate:deploy
```

The migration runs as a one-off `api` container rather than from the bare
host: `postgres` isn't published to the host on Test/Production (no
`ports:` entry — see `docker-compose.yml`), only reachable by its service
name from inside the Compose network, and the `api` image already has the
repo, `pnpm`, and this host's `.env` (via `env_file`) available. Never run
`db:migrate:dev` here — it's Local-only (§1).

Caddy provisions its own HTTPS certificate automatically once DNS points at
the server — nothing else to configure for TLS.

### 2.3 Redeploy (routine updates)

Same three commands as §2.2 (`git pull`, `build`, `up -d`), plus the
`db:migrate:deploy` one-off run whenever the pulled commit includes new
migrations.

## 3. Production

**Not provisioned yet — deferred until every dev plan is implemented and
validated on Test** (see "Current status" above). When that time comes, the
steps are identical to §2, with three differences:

1. Use `docker-compose.production.yml` instead of `docker-compose.test.yml`
   in every command.
2. Point `<domain>`/`api.<domain>` DNS at the Production server (a
   **separate** OVH VPS-2 instance — see §5 on server sizing — from Test),
   and update [`docker/Caddyfile.production`](../docker/Caddyfile.production)
   if the placeholder domain hasn't already been replaced repo-wide.
3. `.env` on this host gets Production's own strong secrets and live
   provider credentials (real email, real AI key, real DVLA key) — never
   copy Test's or Local's values here, and never point this environment's
   `DATABASE_URL`/`REDIS_URL`/`UPLOAD_ROOT` at Test's or Local's data.

Before the first real Production deploy, also read Plan 36 (Backup &
Disaster Recovery) — this plan only reserves `/data/backups` as a local
staging directory (§4); the off-site sync job itself is Plan 36's.

Production deploys should promote the exact commit/image that already
passed on Test, not an independently rebuilt one — see §2 of
[`plans/02-environments-infrastructure.md`](../plans/02-environments-infrastructure.md).

## 4. Data layout

Every deployed host (Test, Production — **not** Local, which uses a
project-relative `.data/` directory instead) has this tree under `/data`,
each path **bind-mounted explicitly** — never left as an anonymous Docker
volume, since anonymous volumes don't survive a container/host replace in
any obvious, recoverable way:

```text
/data/
├── postgres/      # Postgres data directory — mounted into the `postgres` service
├── uploads/       # StorageService local files: listings/<id>/{original,large,medium,thumbnail}
│                  # (mounted into both `api` and `worker`, since the worker
│                  #  does the image-processing writes — Plan 12)
├── backups/       # local staging before off-site sync (Plan 36 owns the sync job)
└── catalogue/     # working directory for catalogue import runs, if needed on-host
```

`backups/` and `catalogue/` aren't bind-mounted into any service by this
plan — they're reserved directories that Plan 36 (backups) and Plan 09
(catalogue import tooling) will wire up when they land.

## 5. Server sizing

| Environment | Spec                                                                                         | Notes                                                                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test        | OVH VPS-2 (smaller tier acceptable)                                                          | Doesn't need to match Production's headroom                                                                                                                                                                                  |
| Production  | OVH VPS-2 to start, per the low-cost stack doc's 4 vCPU / 8 GB RAM / 100–200 GB SSD guidance | Web, API, Postgres, Redis, and the worker all share this one box (§2 of the plan) — resize/upgrade the VPS tier if it's undersized once real traffic shows up, rather than pre-provisioning for scale that doesn't exist yet |

## 6. Never do this

- Never point Local or Test's `DATABASE_URL`, `REDIS_URL`, or `UPLOAD_ROOT`
  at Production's.
- Never commit a real `.env`/`.env.local` — both are gitignored; only
  `.env.example` is committed, and only with placeholder values.
- Never copy Production data into Local or Test for debugging without
  removing/anonymizing personally identifiable information first.
- Never hand-edit the Production database schema outside a Prisma
  migration, except genuine emergency recovery.
