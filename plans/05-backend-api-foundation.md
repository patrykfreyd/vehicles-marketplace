# Plan 05 — Backend API Foundation

Status: Draft
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

- [ ] `GET /api/v1/health` returns 200 with a Zod-validated body when
      Postgres/Redis are reachable, and a correctly-shaped `ApiError` (503,
      `code: "INTERNAL_ERROR"` or a dedicated health code) when one isn't.
- [ ] Sending an invalid request to any endpoint returns
      `{ code: "VALIDATION_ERROR", fieldErrors: {...} }` matching
      `ApiErrorSchema` exactly, generated from the same Zod schema used to
      validate it.
- [ ] `/api/docs` renders Swagger UI in Local, showing the health
      endpoint's schema correctly derived from Zod (not hand-written).
- [ ] `pnpm generate:api-client` produces a typed client that `apps/web`
      can call to hit `/health` with full type inference on the response.
- [ ] `apps/worker` boots via `createApplicationContext` (no HTTP port
      opened) and successfully processes one test BullMQ job end-to-end
      against local Redis.
- [ ] An ESLint rule rejects an untyped `@Body()` parameter added to a
      test controller, proving the "every DTO is a Zod schema" rule is
      enforced, not just documented.
- [ ] `pnpm lint`/`typecheck`/`test`/`build` all remain green.

## 12. Open questions for you

1. Confirm `nestjs-zod` as the Zod↔Nest bridge (§3), or would you rather
   avoid the dependency and hand-roll the validation pipe + OpenAPI
   generation?
2. Confirm `openapi-typescript`/`openapi-fetch` for the generated client,
   or do you have a preferred codegen tool already (e.g. `orval`)?
3. Should Swagger UI be reachable at all in Test (behind basic auth), or
   fully disabled outside Local as the default posture?
