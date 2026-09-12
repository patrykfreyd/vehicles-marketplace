# Plan 36 — Backup & Disaster Recovery

Status: Draft
Depends on: Plan 02 (`/data` layout, `/data/backups` staging directory
already reserved), Plan 06 (the Postgres database this backs up), Plan 12
(`/data/uploads` this backs up)
Blocks: nothing structurally downstream — but this is the plan whose
absence would be most catastrophic if skipped

## 1. Objective

Implement real, **tested** off-server backup for Production: nightly
Postgres dumps and incremental media backup, encrypted and retained per
the stack doc's exact schedule, with dead-man's-switch monitoring so a
silent backup failure doesn't go unnoticed, and — the part most real
backup strategies skip — a **recurring, mandatory restore drill** that
proves the backups actually work, not just that they exist.

"Done" means: Production's database and uploads are backed up nightly to
an off-server destination, the encryption key is recoverable even if the
Production server is completely destroyed, a failed backup job triggers
an alert within hours (not discovered during an actual disaster), and a
documented restore has actually been performed successfully at least
once.

## 2. Decisions carried over from the stack doc

- Nightly PostgreSQL backup via `pg_dump`, retention: **7 daily, 4
  weekly, 6 monthly**.
- Incremental media backup via `restic` or `rclone`.
- Backup must **not** exist only on the same server it protects.
- Redis, Local, and Test have progressively lighter/no backup
  requirements (Plan 02 §3.10's summary table) — this plan's real
  engineering effort is scoped to **Production**.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Unified backup tool | **`restic`** for both the Postgres dump file and `/data/uploads` — not `pg_dump` + a hand-rolled rotation script plus a separate `rclone` sync | Restic backs up any files (including a `pg_dump` output file), and its built-in `--keep-daily 7 --keep-weekly 4 --keep-monthly 6` retention plus `forget --prune` implements the exact stack-doc schedule without hand-rolling rotation logic twice for two different backup types |
| Off-server destination | **Backblaze B2** — cheap, S3-compatible object storage with native `restic`/`rclone` support | Purpose-built for exactly this use case at low cost, distinct from the "avoid AWS/managed infra" list (stack doc §34) — B2 isn't a general compute platform, it's specifically cheap object storage |
| Trigger mechanism | **Host-level cron/systemd timer**, not a BullMQ job inside the application | If the application itself is crashed or broken, backups still need to run — a host-level scheduled job is decoupled from the app's own health, which is exactly the scenario a backup exists to protect against |
| Encryption key storage | Restic's repository encryption key **must be stored somewhere other than the Production server itself** (a password manager, a secrets vault — anywhere off that one machine) | The single most common real-world backup failure mode: an encrypted off-site backup is worthless if the only copy of the decryption key lived on the server that just failed. This is worth stating as a hard requirement, not an implementation detail |
| Failure monitoring | **A dead-man's-switch service (e.g. healthchecks.io, free tier)** — the backup script pings it on success; if no ping arrives within the expected window, it alerts | Cheap, well-known pattern for monitoring scheduled jobs without standing up a full monitoring stack — a silently failing nightly cron job is otherwise invisible until the moment you actually need the backup |
| Restore drills | **Mandatory, recurring (proposed: quarterly)** — not a one-time verification | Untested backups are one of the most common causes of real disaster-recovery failure. "The backup job ran successfully" and "we can actually get the marketplace back online from this backup" are different claims, and only a real drill proves the second one |
| What's excluded | **Redis is explicitly not backed up** | Everything stored in Redis (BullMQ job state, rate-limit counters, ephemeral session/cache data) is deliberately transient and reconstructable — backing it up would imply a durability guarantee that was never the design |

## 4. Backup script (runs nightly via host cron)

```bash
#!/usr/bin/env bash
set -euo pipefail

pg_dump -Fc "$DATABASE_URL" > /data/backups/postgres/dump-$(date +%F).dump

restic backup /data/backups/postgres/dump-$(date +%F).dump /data/uploads \
  --repo b2:bucket-name:path

restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune \
  --repo b2:bucket-name:path

curl -fsS -m 10 "$HEALTHCHECKS_IO_PING_URL" > /dev/null   # dead-man's-switch success ping
```

Env vars added to Plan 02's contract: `RESTIC_REPOSITORY`,
`RESTIC_PASSWORD` (the encryption key — stored per §3, never only on the
server), `B2_ACCOUNT_ID`/`B2_APPLICATION_KEY`, `HEALTHCHECKS_IO_PING_URL`.

## 5. Restore runbook (`docs/restore-runbook.md`)

Documented steps, extending Plan 02's existing runbook pattern:

```text
1. Provision a replacement server if the original is gone (per Plan 02's
   architecture — same Docker Compose setup)
2. restic restore latest --repo b2:bucket-name:path --target /data/backups/restore
3. pg_restore the recovered dump into a fresh Postgres instance
4. Copy the recovered /data/uploads into place
5. Point the application's DATABASE_URL/UPLOAD_ROOT at the restored data
6. Run the application's own /health check to confirm it's serving
   correctly against the restored data
7. Update DNS/Caddy if the server's address changed
```

This exact procedure is what the quarterly drill (§6) actually exercises
— the drill isn't "check that a backup file exists," it's "run these
seven steps against a scratch environment and confirm it works."

## 6. Restore drill process

- **Cadence**: quarterly (proposed), performed against a disposable
  scratch environment — never against Production itself.
- **What's verified**: the restored database contains real, recent data;
  the restored uploads directory serves real images; the application
  boots and passes its own health check against the restored state.
- **Record kept**: date performed, who performed it, any issues found and
  fixed in the runbook as a result — the drill's value comes partly from
  catching runbook drift (a step that was accurate six months ago but
  isn't anymore) before a real disaster does.

## 7. Out of scope for this plan

- Backup for Local (none needed — freely disposable/recreatable) and Test
  (a lighter, optional local-only backup at most, per Plan 02 §3.10)
- Redis backup → deliberately excluded per §3
- Point-in-time recovery (continuous WAL archiving) beyond nightly
  snapshots — a real future enhancement if RPO requirements tighten, not
  needed for V1
- Multi-region/geo-redundant backup storage — one off-server destination
  is sufficient for this stage

## 8. Acceptance criteria

- [ ] The nightly backup script successfully produces a `pg_dump` and
      backs it up, along with `/data/uploads`, to Backblaze B2 via
      `restic`.
- [ ] `restic forget --prune` correctly enforces the 7/4/6 retention
      schedule against a fixture set of snapshots spanning several
      months.
- [ ] A simulated backup script failure results in a missed
      healthchecks.io ping and a real alert being received — not silent
      failure.
- [ ] The `RESTIC_PASSWORD` encryption key is confirmed stored in at
      least one location other than the Production server itself.
- [ ] A full restore drill has actually been performed at least once
      against a scratch environment, following `docs/restore-runbook.md`
      exactly, with the application successfully passing its health
      check against the restored data — documented with date and outcome.
- [ ] `pnpm lint`/`typecheck`/`build` remain green for any tooling/scripts
      this plan adds to the repo.

## 9. Open questions for you

1. Confirm Backblaze B2 as the off-server destination, or do you have an
   existing preferred provider/account?
2. Who should perform and sign off on the quarterly restore drill once
   this is running — you, or should it be documented clearly enough that
   anyone on the team could run it?
3. Confirm the 7-daily/4-weekly/6-monthly retention schedule, or would
   you like it tuned (e.g. longer monthly retention for compliance
   reasons)?
