# Plan 05 — Backend API Foundation

Status: Implemented — resolved 2026-09
Depends on: Plan 01 (`apps/api`, `apps/worker` shells), Plan 02
(`DATABASE_URL`/`REDIS_URL` contract), Plan 03 (`ApiErrorSchema`, enums,
schema conventions this plan wires into NestJS)
Blocks: every module-owning plan from here on — Plan 06 (Prisma module
wiring), Plan 07 (auth guards/decorators), and every feature plan that adds
a controller (08–34), all of which assume the module skeleton, validation
pipe, error format, and generated client this plan sets up.

## 1. Objective

Turn `apps/api` from Plan 01's placeholder health endpoint into a real
**NestJS modular monolith skeleton**: the module boundaries, the
Zod-based request/response validation pipeline, a global error handler that
emits the `ApiErrorSchema` shape from Plan 03, OpenAPI generation, the
generated TypeScript client consumed by web/mobile, and the process split
between the HTTP `api` and the queue-consuming `worker`. This plan adds
**no business logic** — every module it creates is an empty shell with the
right shape, ready for its owning plan (07 Auth, 08 Catalogue, 11
Vehicles/Listings, etc.) to fill in.

"Done" means: a new empty module can be added by copying the template in
§5, its Zod-validated endpoint shows up correctly in Swagger, its errors
come back in the shared `ApiError` shape, `pnpm generate:api-client`
produces a working typed client, and `apps/worker` boots and processes a
trivial test job from the same codebase without running an HTTP server.

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md`

- Framework: **NestJS**, REST, OpenAPI/Swagger, one **modular monolith**
  (not microservices).
- Module list (from the stack doc, §2 Backend): Auth, Users, Catalogue,
  Vehicles, Vehicle Lookup, Listings, Search, Favourites, Watchlists,
  Messaging, Seller Dashboard, Analytics, Notifications, AI, Payments,
  Moderation, Admin.
- Process separation: **API** (HTTP) and **Worker** (BullMQ) as two
  entrypoints over the same source, per the stack doc's "possible process
  separation" — this plan is what actually implements that split.
- Validation at every API boundary via **Zod** (Plan 03's schemas), not
  duplicated `class-validator` DTOs.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Zod ↔ NestJS integration | **`nestjs-zod`** (`createZodDto`, `ZodValidationPipe`, `zodToOpenAPI`) | Lets a single Zod schema from `packages/validation` become both the runtime validator *and* the Swagger schema — avoids hand-maintaining parallel `class-validator` DTOs that could drift from the Zod source of truth |
| API client generation | **`openapi-typescript` + `openapi-fetch`** against the generated `openapi.json` | Thin, no codegen "magic" runtime, output is plain typed fetch calls — fits the "boring stack" philosophy better than a heavier client generator |
| API versioning | URI prefix from day one: `/api/v1/...` | Cheap now, painful to retrofit once mobile apps are in app-store review with a hardcoded base URL |
| Logging | **`nestjs-pino`**, structured JSON, one request-correlation ID per request | Needed to make Test/Production logs (per Plan 02) actually useful; negligible setup cost |
| Rate limiting | **`@nestjs/throttler`**, a conservative global default now, tightened per-endpoint by the plans that own sensitive endpoints (login, message send, etc.) | Cheap to add now, expensive to retrofit after abuse happens |
| HTTP hardening | `helmet`, environment-driven CORS allowlist (`APP_URL` + mobile's Expo scheme) | Minimal, standard |
| Health checks | `@nestjs/terminus`, checking Postgres + Redis connectivity, replacing Plan 01's placeholder `/health` | Needed by Plan 02/35 deploy scripts to confirm a new release is actually up before promoting traffic |

Flag: `nestjs-zod` is the one library choice here most worth a second
opinion — the alternative is hand-writing a small custom `ZodValidationPipe`
plus a manual OpenAPI-from-Zod step, which is more code but zero extra
dependency. Recommendation is to take the dependency; say so if you'd
rather avoid it.

## 4. Response & error conventions

- Single-resource endpoints return the resource directly (no `{ data: ... }`
  envelope) — matches the Zod schema for that resource one-to-one.
- List endpoints return `PageResponseSchema<T>` from Plan 03
  (`{ items: T[], nextCursor, total }`), never a bare array, so pagination
  never has to be bolted on later.
- Every error response — validation failure, thrown `HttpException`,
  unhandled exception — passes through one **global exception filter** that
  serializes it to `ApiErrorSchema` (Plan 03 §6):

```ts
// apps/api/src/common/filters/api-exception.filter.ts (shape, not full code)
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // ZodValidationException -> { code: "VALIDATION_ERROR", message, fieldErrors }
    // HttpException          -> { code: <mapped from status>, message }
    // anything else          -> log full detail, respond { code: "INTERNAL_ERROR", message: "Something went wrong" }
  }
}
```

- Unhandled/5xx errors always log the full stack via `nestjs-pino` but
  **never** leak internal detail into the `message` field the client toasts
  — the toast-safe generic message and the diagnostic log are deliberately
  different things.
- Standard error codes established now so every module reuses them rather
  than inventing new ones: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## 5. Module template (used by every future module-owning plan)

```text
apps/api/src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dto/                     # createZodDto(...) wrappers around packages/validation schemas
└── <name>.controller.spec.ts
```

Rules for every module built on this template:

- Controllers depend only on their own service and shared providers
  (Prisma client, logger) — never reach into another module's service
  directly; cross-module calls go through the other module's exported
  service via Nest's DI, keeping module boundaries real even inside one
  process (this is what keeps "modular monolith" from silently becoming
  "one big tangled app," and what makes a future split into separate
  services — Plan 02 §36 Stage 7 — realistic if it's ever needed).
- No controller accepts or returns a raw object without a Zod DTO —
  enforced by an ESLint rule (extends Plan 01's shared config) rejecting
  untyped `@Body()`/`@Query()` parameters.
- Every module ships alongside its owning feature plan (Auth in Plan 07,
  Catalogue in Plan 08, etc.) — this plan creates **zero** of the 17 modules
  itself, only the template and one throwaway example used to prove the
  pipeline end-to-end (see §9).

## 6. API ↔ Worker process split

Both processes share the exact same Nest module graph; they differ only in
entrypoint:

```ts
// apps/api/src/main.ts — HTTP process
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix("api/v1");
// ... helmet, CORS, ZodValidationPipe, ApiExceptionFilter, Swagger setup
await app.listen(process.env.PORT ?? 3001);

// apps/worker/src/main.ts — queue-consumer process, no HTTP listener
const app = await NestFactory.createApplicationContext(WorkerModule);
// BullMQ processors registered via @nestjs/bullmq resolve from the same DI container
```

`WorkerModule` imports only the modules that register BullMQ processors
(image processing from Plan 12, analytics aggregation from Plan 28, etc.);
it deliberately does **not** import controller-only modules, keeping the
worker process lighter than the full API. Both `docker-compose.yml`
services (`api`, `worker` — already defined in Plan 02) point at these two
entrypoints from the same built image, per the stack doc's "worker uses the
same image, different command" pattern.

## 7. OpenAPI generation & the generated client

```text
apps/api  → Swagger module (nestjs-zod's zodToOpenAPI feeding @nestjs/swagger)
         → `pnpm --filter api generate:openapi` writes openapi.json
                    ↓
packages/api-client → `pnpm generate:api-client` runs openapi-typescript
                       against openapi.json, producing typed request/response
                       types + thin openapi-fetch wrapper functions
                    ↓
apps/web, apps/mobile import from @vehicles-marketplace/api-client
```

This closes the loop the stack doc calls for ("generate a TypeScript API
client... shared by web, mobile, internal admin") and means a change to a
Zod schema in `packages/validation` propagates automatically to the
generated client's types the next time this script runs, catching a
mismatched caller at typecheck time rather than at runtime.

## 8. Cross-cutting middleware/interceptors added by this plan

- `ZodValidationPipe` (global) — validates `@Body()`/`@Query()`/`@Param()`
  against each DTO's Zod schema before the handler runs.
- `ApiExceptionFilter` (global, §4).
- Request-logging interceptor — logs method/path/status/duration/
  correlation-id per request via `nestjs-pino`.
- `helmet()` and environment-driven CORS.
- `ThrottlerGuard` (global default; specific limits tuned per-endpoint by
  later plans).
- Swagger UI mounted at `/api/docs` in Local/Test only (disabled or
  auth-gated in Production).

## 9. What this plan actually scaffolds

- `AppModule`/`WorkerModule` wiring described above.
- One throwaway `HealthModule` (real, using Terminus — supersedes Plan 01's
  placeholder) proving the full pipeline: Zod-validated response, correct
  OpenAPI entry, correct error shape if Postgres/Redis are down.
- The module template in §5 as a generator script or copy-paste README
  snippet (`pnpm nest g` schematic is a nice-to-have, not required for V1).
- `packages/api-client`'s real generation pipeline (§7), still only
  producing a client for the `Health` endpoint until later plans add more.

## 10. Out of scope for this plan

- Any of the 17 business modules' real logic → each owned by its plan
  (Auth → 07, Catalogue → 08/09, Vehicles/Listings → 11, Search → 13, AI →
  14/21, Seller Dashboard → 23, Messaging → 25, Analytics → 27/28,
  Payments → 34, Moderation → 32, Admin → spread across the plans that need
  an admin view)
- Authentication/authorization guards → **Plan 07** (this plan's
  `ThrottlerGuard`/`helmet` are transport-level hardening, not identity)
- Prisma schema/client setup → **Plan 06** (this plan assumes a Prisma
  client exists as an injectable provider but doesn't define its schema)
- Real per-endpoint rate limits, request size limits for file uploads →
  tuned by Plan 12 (uploads) and whichever plan owns each sensitive
  endpoint

## 11. Acceptance criteria

- [x] `GET /api/v1/health` returns 200 with a Zod-validated body when
      Postgres/Redis are reachable, and a correctly-shaped `ApiError` (503,
      `code: "SERVICE_UNAVAILABLE"` — the dedicated health code; see §12.4)
      when one isn't. Verified for real against live Postgres/Redis in
      Docker, both up and (Redis) stopped.
- [x] Sending an invalid request to any endpoint returns
      `{ code: "VALIDATION_ERROR", fieldErrors: {...} }` matching
      `ApiErrorSchema` exactly, generated from the same Zod schema used to
      validate it. Proven by `ApiExceptionFilter`'s tests (a Zod parse
      failure → 400 `VALIDATION_ERROR` with `fieldErrors`); no module in
      this plan has a request body to validate yet (Health is the only
      endpoint, and it's a bodyless `GET`), so a real end-to-end validation
      failure through an actual controller is Plan 07/08's proof to add.
- [x] `/api/docs` renders Swagger UI in Local (no auth) and Test (behind
      HTTP basic auth), never in Production — see §12.4. Verified for real:
      `/api/docs` and `/api/docs-json` both show the health endpoint's
      schema derived from `HealthCheckResponseDto` (a `createZodDto`
      wrapper), not hand-written.
- [x] `pnpm generate:api-client` produces a typed client that `apps/web`
      (or any app) can call to hit `/api/v1/health` with full type
      inference on the response — proven by `packages/api-client`'s test,
      which does exactly that against a mocked fetch. `apps/web`/
      `apps/mobile` aren't rewired to actually call it — both still render
      from the local `createHealthCheck()` helper Plan 01 gave them, which
      this plan didn't touch; wiring a real network call into either app is
      out of scope ("no business logic", §1).
- [x] `apps/worker` boots via `createApplicationContext` (no HTTP port
      opened) and successfully processes one test BullMQ job end-to-end
      against local Redis. Verified for real against live Redis/Postgres in
      Docker (`DiagnosticsProcessor`, `apps/worker/src/modules/diagnostics/`).
- [x] An ESLint rule (`local/require-typed-nest-params`,
      `packages/eslint-config/rules/require-typed-nest-params.js`) rejects
      an untyped `@Body()`/`@Query()`/`@Param()` parameter — proven via
      `@typescript-eslint/rule-tester` against representative valid/invalid
      controller snippets (its `test.ts`), rather than by committing
      actually-broken source that `pnpm lint` would then fail on.
- [x] `pnpm lint`/`typecheck`/`test`/`build` all remain green (verified
      with real Postgres/Redis in Docker, so `apps/worker`'s
      infra-dependent tests ran for real rather than skipping).

## 12. Open questions for you — resolved 2026-09

1. **Confirmed `nestjs-zod`** as originally proposed (§3, `createZodDto`,
   `ZodValidationPipe`, `ZodSerializerInterceptor`/`@ZodResponse`, plus
   `@nestjs/swagger`'s own introspection of a `createZodDto` class's
   `_OPENAPI_METADATA_FACTORY` — the v5 release actually installed no
   longer needs the `patchNestJsSwagger()` call §3 anticipated).
2. **Confirmed `openapi-typescript` + `openapi-fetch`** as originally
   proposed (§3/§7) — no change.
3. **Swagger UI is reachable in Test too**, behind HTTP basic auth
   (`SWAGGER_USER`/`SWAGGER_PASSWORD`, real values only in Test's untracked
   `.env` — see `.env.example`); still fully disabled in Production. See
   §12.4 for how that's implemented (`apps/api/src/swagger.ts`).

## 12.4. Deviations from this plan worth flagging

- **One error code added to §4's fixed list: `SERVICE_UNAVAILABLE` (503)**,
  for `GET /health` failing — §4 itself invited this ("`INTERNAL_ERROR` or
  a dedicated health code"). `CONTRIBUTING.md`'s "Backend module
  conventions" section is the up-to-date copy of the full list; reuse it
  before inventing another one.
- **The global exception filter masks every 5xx, not just genuinely
  unhandled exceptions** — including a *deliberately-thrown* `HttpException`
  that happens to carry a 5xx status (Terminus's `ServiceUnavailableException`
  from a failed health check, or `nestjs-zod`'s `ZodSerializationException`
  from a handler's return value not matching its own response DTO). §4's
  prose reads as if only "anything else" (non-`HttpException`) gets masked;
  in practice, a 5xx is a bug or an infra failure either way, and never
  something the code intended a client to see the detail of, so it's
  treated the same as a truly unhandled exception — logged in full,
  answered with the generic message. Only a 4xx `HttpException`'s message
  passes through as-is.
- **`GET /health` parses its response manually
  (`ApiHealthCheckSchema.parse(result)`) instead of using `@ZodResponse`.**
  Terminus's `HealthCheckResult` return type is generic enough (`info`/
  `error` are effectively `Partial<...>`, so TS sees "value may be
  `undefined`" where the schema's inferred type doesn't allow it) that
  `@ZodResponse`'s compile-time return-type check can't be satisfied
  without casting the return value away — manual `.parse()` gets the same
  runtime guarantee with an exact result type. The DTO-drives-Swagger
  pattern itself is intact via `@ApiOkResponse({ type: HealthCheckResponseDto })`;
  a module whose handler returns a plain object (i.e. every real business
  endpoint) shouldn't hit this and can use `@ZodResponse` as designed.
- **A wildcard `NotFoundFallbackController` (`apps/api/src/common/not-found/`)
  was added, not in the original plan.** Without it, a request to a route no
  controller claims (e.g. a typo'd path) never reaches Nest's exception
  pipeline at all — Express's own fallback returns its default HTML
  "Cannot GET /..." page, not `ApiErrorSchema` — breaking §4's "every error
  response" guarantee (caught by hitting a wrong URL during manual
  verification). Registered last in `AppModule` so every real route still
  matches first.
- **`apps/worker/src/app.module.ts` → `worker.module.ts`, class `AppModule`
  → `WorkerModule`** — matches §6's own code sample, which already used
  that name; the Plan 01 scaffold hadn't picked it up yet.
- **Test files are `*.test.ts`, not `*.spec.ts`** as §5's template text
  literally shows — matches every other test file in this repo (Plan 01's
  convention); `*.spec.ts` isn't used anywhere.
- **`apps/api`/`apps/worker`'s `dev` script now loads `.env.local` itself**
  (via `dotenv-cli`, e.g. `dotenv -e ../../.env.local -- node --watch ...`).
  Neither app had any env-loading mechanism before this plan (nothing
  needed a real env var yet); Next.js auto-loads `.env.local` for `apps/web`
  but NestJS has no equivalent, so without this, Hybrid-mode `pnpm dev`
  would fail validating `DATABASE_URL`/`REDIS_URL`. Harmless under Docker
  (`start`, and `dev` under Full-Docker-local) — `env_file` already injects
  real values directly into `process.env` there, and a `dotenv-cli` load of
  a same-named var it can't find (or that's already set) is a no-op.
- **`packages/config`'s `EnvSchema` gained `APP_ENV`, `APP_URL`, `API_URL`,
  `PORT`, `DATABASE_URL`, `REDIS_URL`, `SWAGGER_USER`, `SWAGGER_PASSWORD`**
  — this plan is the first consumer of Plan 02's env contract beyond
  `NODE_ENV`, per that file's own "extend `EnvSchema` instead of inventing
  ad hoc `process.env` reads" comment. `DATABASE_URL`/`REDIS_URL` are
  required with no default (fail loudly if unset); the rest default to
  their Local values.
- **`.github/workflows/ci.yml` gained `postgres`/`redis` services and their
  connection env vars**, and a step that regenerates `packages/api-client`
  and fails the build if it drifts from what's committed. This plan is the
  first whose tests need real infra to prove anything (`apps/worker`'s
  BullMQ tests skip gracefully without it, per the point below, but CI
  should exercise them for real, not just skip).
- **`apps/worker`'s infra-dependent tests skip instead of failing when
  `DATABASE_URL`/`REDIS_URL` aren't set**, so `pnpm test` stays green on a
  machine with no Postgres/Redis running (see
  `apps/worker/src/worker.module.test.ts` and `vitest.setup.ts` for why the
  guard reads a derived `WORKER_TEST_HAS_REAL_INFRA` rather than the env
  vars directly — `WorkerModule`'s `ConfigModule.forRoot` validates
  `process.env` *at import time*, before any test's `describe.skipIf` gets
  a chance to run). `turbo.json`'s `test` task now also declares both env
  vars, so turbo's cache correctly treats "ran for real" and "skipped" as
  different results instead of replaying a stale one.
- **Two third-party packages' declared peer-dependency ranges don't yet
  include Nest 12**: `nestjs-zod@5.5.0` (`@nestjs/common ^10||^11`) and
  `@nestjs/throttler@6.5.0` (`@nestjs/core` up to `^11`). Both work
  correctly against the Nest 12 actually installed (verified: full
  `lint`/`typecheck`/`test`/`build`, plus a real running `apps/api`, all
  green) — this repo's `.npmrc` already sets `strict-peer-dependencies=false`
  for exactly this kind of fast-moving-ecosystem mismatch, so `pnpm install`
  warns rather than fails. Worth re-checking next time either package
  bumps its peer range.
- **Each health indicator opens a short-lived Postgres/Redis connection per
  check** (`apps/api/src/modules/health/indicators/`) rather than sharing a
  persistent client — there's no Prisma client yet to inject (Plan 06) and
  health checks are infrequent; revisit once Plan 06/a BullMQ producer in
  `apps/api` gives these a persistent connection to reuse instead.
