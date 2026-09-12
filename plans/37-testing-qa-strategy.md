# Plan 37 — Testing & QA Strategy

Status: Draft
Depends on: Plan 01 (Vitest for web/api/worker, Jest for mobile — already
fixed, not re-decided here), Plan 05 (the generated API client contract
tests validate), Plan 04 (component tests for `ui-web`/`ui-mobile`)
Blocks: nothing structurally downstream — but this plan formalizes a
pattern nearly every prior plan already relied on informally

## 1. Objective

Every plan from 08 onward has carried its own scattered testing
requirements — "verified against a mid-range Android device" (Plan 16),
a hallucination-check test repeated across five different AI features
(Plans 14/15/18/21/23/25), and the same "BMW M4 fixture" referenced across
a dozen plans without anyone formally owning it as shared infrastructure.
This plan collects those into one coherent strategy: the test pyramid,
contract testing for the generated API client, a real device-testing
policy, a named category for AI-grounding tests, and — concretely — a
shared fixtures package so "the BMW M4 fixture" is written once.

"Done" means: the testing conventions below are documented and actually
followed going forward, `packages/test-fixtures` exists with the
canonical vehicles this whole plan series has been informally assuming,
and CI runs the right test tier at the right time (fast tests on every
PR, slower E2E on a schedule and before Production promotion).

## 2. The test pyramid

```text
Unit (most numerous, fastest)
  → pure functions: Zod schema validation, every deterministic
    scoring/matching function this project has built (catalogue
    completeness §Plan 08, photo coverage §Plan 12, price banding
    §Plan 22, Advert Score §Plan 23, fraud thresholds §Plan 31, dealer
    performance rollup §Plan 33) — these are exactly the functions this
    project has deliberately kept deterministic rather than AI-scored,
    which is also exactly what makes them cheap and valuable to test
    exhaustively

Integration (moderate)
  → real NestJS modules against a real test Postgres/Redis (via
    docker-compose.test.yml or Testcontainers), exercising actual API
    endpoints end to end within the backend

E2E (fewest, most valuable per-test, slowest)
  → full user journeys through the real UI — web via Playwright, mobile
    via Maestro (§3)

AI grounding tests (a named category, not folded into "unit")
  → the pattern already used in Plans 14/15/18/21/23/25: a fixture with
    known, limited ground truth; assert the AI's output never exceeds
    it. Named explicitly here because most testing strategies don't have
    this as a category, but this project has needed it repeatedly enough
    that it deserves to be recognized as one
```

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Mobile E2E framework | **Maestro** over Detox | Maestro's YAML-based tests and simpler setup avoid Detox's heavier native-build-configuration overhead — a more pragmatic, lower-maintenance choice for a small team, consistent with this project's "boring, simple" tooling preference throughout. Detox has a more mature ecosystem if deep native-level testing is ever needed — flagged as the fallback, not dismissed |
| Contract testing | A dedicated suite that runs the **real generated API client against a real running Test-environment API** — not mocked | Types alone don't catch every contract violation (a field that's technically typed correctly but is unexpectedly `null` in practice, for example). Mocking the client in *these specific tests* would defeat their purpose; ordinary frontend unit/component tests should still mock the API layer where the backend genuinely isn't what's being tested |
| Coverage target | **No blanket percentage target.** Instead: every deterministic scoring/matching/completeness function has explicit pass/fail test cases (already the de facto rule this project's plans have followed) | A coverage-percentage target can perversely incentivize low-value tests written just to move the number — the qualitative rule ("every deterministic function is actually tested against real cases") is a better proxy for the thing that actually matters |
| Device testing | Start with **1–2 real physical devices the team owns** (one mid-range Android, one recent iPhone) rather than a paid device-cloud subscription (BrowserStack, AWS Device Farm) | Matches this project's cost-conscious philosophy — device-cloud services are a reasonable *future* upgrade once team/budget grows, not a V1 requirement |
| Shared fixtures | A new **`packages/test-fixtures`** package holding the canonical BMW M4 G82 fixture (already referenced informally across Plans 08/09/10/13/15/19/22/etc.) plus a small handful of other reusable fixtures (a comparable BMW 3 Series, an Audi) | Consolidates test data that's been informally assumed shared across a dozen plans into something actually shared — one fixture definition, not a dozen slightly-different reimplementations |
| E2E's role in deployment | A small, curated **smoke E2E suite** (register+login, search+view a listing, start a message) gates Plan 35's Test→Production promotion, complementing (not replacing) its `/health` check; the **full** E2E suite runs on a nightly schedule, not on every PR | E2E tests are slower and flakier than unit/integration tests — running the full suite on every PR would slow feedback loops without proportional value; a small curated smoke suite is the right amount of E2E in the deploy-gating path |

## 4. `packages/test-fixtures`

```text
packages/test-fixtures/src/
├── catalogue/
│   ├── bmw-m4-g82-competition-xdrive.ts   ← the fixture this whole series has assumed
│   ├── bmw-3-series-comparable-set.ts
│   └── audi-tt-rs.ts
├── vehicles/
│   └── ... (sample Vehicle/Listing records built on the catalogue fixtures)
└── index.ts
```

Every prior plan's acceptance criteria that referenced "the BMW M4
fixture" is retroactively satisfied by importing from this package rather
than each test file redefining equivalent data with subtly different
values that could silently drift apart.

## 5. CI test execution (extends Plan 35's pipeline)

```text
Every PR:        unit + integration + contract tests
Nightly:         full E2E suite (Playwright + Maestro)
Before Production promotion: smoke E2E suite (Plan 35 §4's health-check
                  gate, plus this small curated journey suite)
```

## 6. Out of scope for this plan

- Load/performance testing — not addressed by any idea doc's requirements
  yet; worth a future plan once real traffic patterns exist to test
  against
- Visual regression testing — a reasonable future addition, not V1-
  critical
- Paid device-cloud service integration — deferred per §3, revisit once
  team/budget grows

## 7. Acceptance criteria

- [ ] `packages/test-fixtures` exists with the canonical BMW M4 fixture,
      and at least three prior plans' existing tests are updated to
      import from it rather than redefining equivalent data locally.
- [ ] A contract test hitting the real generated API client against a
      real Test-environment API catches an intentionally-introduced
      mismatch (e.g. a field the client expects but the API omits).
- [ ] The AI-grounding test pattern is documented with one canonical
      example, referencing back to where it's already used (Plans
      14/15/18/21/23/25) rather than each of those maintaining their own
      slightly different version of the same idea.
- [ ] A Maestro smoke test for "register, search, view a listing" runs
      successfully against a real build.
- [ ] The smoke E2E suite is wired into Plan 35's Production-promotion
      gate and correctly blocks promotion on a simulated failure.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 8. Open questions for you

1. Confirm Maestro over Detox for mobile E2E, or do you have existing
   familiarity with one that should weigh into this decision?
2. Do you (or will you) have physical test devices available, or should
   this plan budget for a device-cloud subscription from the start?
3. Comfortable with the qualitative "every deterministic function is
   tested" rule instead of a coverage-percentage target, or would you
   prefer a hard number as a baseline regardless?
