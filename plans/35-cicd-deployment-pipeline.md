# Plan 35 — CI/CD & Deployment Pipeline

Status: Draft
Depends on: Plan 01 (Turborepo build scripts, the minimal PR check this
plan extends), Plan 02 (environments, Docker Compose files, the manual
runbook this plan automates), Plan 05 (`/health` endpoint used as the
deploy gate), Plan 06 (`db:migrate:deploy` script this pipeline invokes)
Blocks: nothing structurally downstream

## 1. Objective

Automate the Local → Test → Production promotion flow Plan 02 §8
described manually, using GitHub Actions: build once, tag images
immutably by commit SHA, auto-deploy to Test, gate Production behind a
real manual approval, and deploy Production the **exact same image** that
passed Test — never rebuilding separately. Also covers the structurally
different mobile deployment path (Expo EAS), since leaving mobile out of
a "CI/CD" plan would ignore half the product.

"Done" means: merging to `main` automatically builds, pushes, and deploys
to Test with a health-check gate, a human approves promoting that exact
build to Production through GitHub's native environment protection (no
custom approval tooling built), and rolling back Production means
redeploying a previous known-good tag, not reverting code and rebuilding.

## 2. Decisions carried over from the stack doc

- "Production should deploy the **same commit/build that passed Test**
  rather than rebuilding from unrelated source state."
- "Keep Production deployment manual/approved initially. Full automatic
  Production deployment is unnecessary at this stage."
- Same Docker Compose architecture across Test and Production (Plan 02) —
  this pipeline deploys to both using the same mechanism, different
  target host/env file.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Container registry | **GitHub Container Registry (GHCR)** | Free/cheap, no separate account or provider to manage, integrates directly with the GitHub Actions workflow already building the images — consistent with keeping fixed infrastructure cost near zero |
| Image tagging | **Immutable tags = commit SHA** — never `latest`, never rebuilt for Production | This is the literal mechanism behind "same artifact promoted": Test and Production both `docker compose pull` the identical SHA-tagged image; Production never triggers its own build |
| Production approval gate | **GitHub Environments' built-in protection rules** (required reviewer on the `production` environment), not a custom-built approval system | GitHub already provides exactly this mechanism for free — building a bespoke approval workflow would be solving an already-solved problem |
| Secrets split | GitHub Actions secrets hold only **deploy access** (SSH key, registry credentials) — the application's real runtime secrets (DB password, API keys, per Plan 02's `.env` contract) live **only** on the target server, never duplicated into GitHub | Minimizes what has to be kept in sync across two secret stores; the pipeline's job is "pull this image and restart the service," not "know the database password" |
| Downtime | **A brief restart-window downtime is an accepted V1 trade-off** — no blue-green/zero-downtime deployment | Matches the stack doc's "boring infra" philosophy; blue-green deployment is real, justified future work (Plan 02 §36's scaling path) once uptime requirements actually demand it, not a default to build against day one |
| Rollback | **Redeploy the previous known-good SHA's images** — a `workflow_dispatch` input taking a target SHA, not a git revert-and-rebuild | Cheap and immediate precisely because images are already immutably tagged and sitting in GHCR — rollback is "pull an older tag," not "wait for a new build" |
| Migration timing | `db:migrate:deploy` runs **before** the new containers start, as a distinct pipeline step with its own success gate | A failed migration should stop the deploy before any new code tries to run against a schema it doesn't expect |
| Mobile deployment | A **separate** workflow using **Expo EAS Build/Submit**, triggered manually or on a release tag — not part of the web/api Docker pipeline at all | Mobile apps aren't deployed to the VPS (stack doc's explicit note) — this is a structurally different pipeline (build → app store review → release), covered here so it isn't silently missing from "CI/CD" |

## 4. Pipeline

```text
Pull Request
  → pnpm install, lint, typecheck, build, test  (extends Plan 01's minimal check)

Merge to main
  → build Docker images (web, api, worker) tagged with the commit SHA
  → push to GHCR
  → SSH to Test host: docker compose pull && docker compose up -d
  → run `db:migrate:deploy` against Test's database
  → call Test's /health endpoint — fail the workflow if unhealthy
  → (Test is now running the new build automatically)

Manual production promotion (workflow_dispatch, gated by GitHub
Environment protection — a human approves in the GitHub UI)
  → deploys the SAME SHA-tagged images already validated on Test
  → run `db:migrate:deploy` against Production's database
  → SSH to Production host: docker compose pull && docker compose up -d
  → call Production's /health endpoint — fail (and alert) if unhealthy

Rollback (workflow_dispatch, target: a previous SHA)
  → SSH to the target host, pull that SHA's images, up -d
  → no rebuild, no migration re-run (rolling back code, not schema —
    schema rollbacks are a separate, explicitly manual/emergency process)
```

## 5. Mobile pipeline (separate)

```text
EAS Build (triggered manually or on a release tag)
  → builds iOS/Android binaries against the current apps/mobile source
  → EAS Submit → App Store Connect / Google Play Console
  → subject to each store's own review process — not something this
    pipeline can automate past submission
```

## 6. Out of scope for this plan

- Blue-green/zero-downtime deployment → future work per Plan 02 §36,
  not built here
- Canary releases, multi-region deployment → not relevant at this scale
- Automated schema-rollback tooling → schema rollbacks remain a manual,
  case-by-case emergency procedure, not automated
- App-store review process itself → outside this pipeline's control

## 7. Acceptance criteria

- [ ] A PR triggers install/lint/typecheck/build/test and blocks merge on
      failure.
- [ ] Merging to `main` results in Test running a container image whose
      tag matches the merge commit's SHA.
- [ ] A failed `/health` check after deploying to Test fails the workflow
      visibly rather than silently leaving Test in a broken state.
- [ ] Promoting to Production is blocked until a human approves via
      GitHub's environment protection UI, and the resulting Production
      containers run the **identical** image tag Test validated — not a
      fresh build.
- [ ] Triggering the rollback workflow with a previous SHA successfully
      reverts a target host to that image without rebuilding.
- [ ] `db:migrate:deploy` failing during a deploy stops the pipeline
      before any new container starts.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green for the
      workflow-authoring changes themselves (linted YAML, etc.).

## 8. Open questions for you

1. Who should be the required reviewer(s) on the Production GitHub
   Environment — just you, or others on the team as it grows?
2. Do you already have Apple Developer / Google Play developer accounts
   set up, or does provisioning those need tracking as a prerequisite
   task before the mobile pipeline in §5 can actually submit builds?
3. Confirm accepting brief restart-window downtime on deploy for V1
   rather than investing in zero-downtime deployment now.
