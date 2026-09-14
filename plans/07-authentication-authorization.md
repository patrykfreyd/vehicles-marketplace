# Plan 07 — Authentication & Authorization

Status: Implemented — resolved 2026-09
Depends on: Plan 02 (`AUTH_SECRET`/domain conventions), Plan 03
(`ApiErrorSchema`, ID strategy), Plan 04 (inline-validated form pattern,
toast system these auth screens use directly), Plan 05 (Nest module
template, guards live here), Plan 06 (baseline `User` model, extended by
this plan)
Blocks: everything that needs to know who's asking — Plan 11 (listing
ownership), Plan 17 (saved items belong to a user), Plan 20 (seller
wizard), Plan 23 (seller dashboard), Plan 25 (messaging), Plan 30
(verification), every admin surface (09, 28, 32)

## 1. Objective

Implement real authentication and a minimal authorization model: email/
password with verification, password reset, Google login, and sessions
usable from both web and mobile — using **Better Auth** against the
Postgres/Prisma setup from Plan 06. This plan also fixes the **single
User, buyer+seller capabilities on one account** model from the stack doc,
and the NestJS guard/decorator pattern every later module uses to check
"who is this" and "are they allowed to do this."

"Done" means: a real user can register, verify their email, log in with
password or Google, stay logged in across a web reload and a mobile app
restart, reset a forgotten password, and hit a protected API route that
correctly rejects them when logged out — all using Plan 04's inline-
validation and toast patterns, not ad hoc forms.

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md`

- **Better Auth** (self-hosted, Postgres-backed) instead of Clerk/Auth0 —
  keeps auth cost at zero fixed spend per the low-cost-stack principle.
- V1 methods: **email/password + email verification + password reset +
  Google login + sessions**. Explicitly deferred: Apple login, MFA,
  additional providers.
- **One account model** — `User` carries buyer behaviour and an optional
  seller profile and optional dealer membership; there is no separate
  seller account/app, and no separate registration flow for sellers.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Better Auth ↔ NestJS integration | Mount Better Auth's request handler on `/api/v1/auth/*` inside a dedicated `AuthModule` controller (wildcard route delegating to Better Auth's Node handler); wrap its session-verification call in a NestJS `AuthGuard` for every other module | Better Auth ships a framework-agnostic handler, not a native Nest adapter — this is the standard integration shape and keeps Better Auth's own well-tested routes (sign-up, callback, etc.) untouched rather than reimplementing them |
| Web session transport | **HttpOnly secure cookie**, scoped to the parent domain (`.{domain}`) so `api.{domain}` and `{domain}` (per Plan 02's subdomain layout) share one session | Standard, XSS-resistant; needs the real domain from Plan 02 §11 to configure cookie scope — placeholder until that's answered |
| Mobile session transport | Better Auth's **bearer-token mode** (session token in `Authorization` header, not a cookie), persisted in `expo-secure-store` | React Native has no shared cookie jar the way a browser does; Better Auth explicitly supports this mode rather than needing a bespoke token scheme |
| Admin capability | A single `isAdmin: Boolean` flag on `User` for V1 — no role/permission table yet | The only admin surfaces that exist by V1 launch (Catalogue Admin, Analytics dashboard, Moderation queue) are all "internal staff or not" — a real RBAC system is unjustified complexity until a second admin tier is actually needed |
| Seller capability | Implicit: presence of a `SellerProfile` row (created the first time the "Sell a car" wizard is started, per Plan 20) — not a `role` enum | Matches the stack doc's "one user, buyer behaviour + seller profile" model directly; a user is a seller the moment they have a `SellerProfile`, nothing to toggle |
| Email provider | **Resend** | Simple API, generous free tier for V1 volume, good TS SDK — first real consumer of the `EMAIL_API_KEY`/`EMAIL_FROM` vars reserved in Plan 02 |
| Login failure messaging | Generic **toast** ("Incorrect email or password"), never attached to a specific field, and identical wording whether the email exists or not | Security convention — attaching the error to the password field (or wording it "no account with that email") leaks which emails are registered |
| Verified-email gating | Require a **verified email** before creating a listing or sending a message; not required to browse, search, save, or watch | Cheap anti-spam/anti-fraud measure (feeds Plan 31 later) without adding friction to the browsing experience that should stay frictionless per the product docs |

Flag: the web cookie-domain choice is blocked on Plan 02's still-open
domain question — this plan can be built against `localhost` now and
finalized once that's answered.

## 4. Data model additions (extends Plan 06's `User` stub)

```prisma
// prisma/schema/user.prisma — Plan 07 extends Plan 06's model
model User {
  id            String   @id
  email         String   @unique
  emailVerified Boolean  @default(false) @map("email_verified")
  displayName   String?  @map("display_name")
  isAdmin       Boolean  @default(false) @map("is_admin")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  sellerProfile SellerProfile?
  accounts      Account[]   // Better Auth: linked credential/OAuth providers
  sessions      Session[]   // Better Auth: active sessions

  vehicles Vehicle[]
  listings Listing[]
  messages Message[]

  @@map("users")
}

model SellerProfile {
  id        String   @id
  userId    String   @unique @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now()) @map("created_at")

  @@map("seller_profiles")
}
```

`Account` and `Session` models are generated by Better Auth's own Prisma
adapter CLI against this schema (per Plan 06 §7's flagged handoff) — this
plan runs that generator rather than hand-writing those tables, since
their exact shape is dictated by the library.

## 5. NestJS auth module shape

```text
apps/api/src/modules/auth/
├── auth.module.ts          # instantiates Better Auth server, mounts its handler
├── auth.controller.ts        # wildcard route → Better Auth's Node handler
├── auth.guard.ts               # verifies session, attaches req.user
├── current-user.decorator.ts    # @CurrentUser() param decorator
├── public.decorator.ts            # @Public() — opts a route OUT of the global guard
├── admin.guard.ts                   # @UseGuards(AdminGuard) — requires isAdmin
└── auth.controller.spec.ts
```

Convention for every other module from here on:

- `AuthGuard` is registered **globally** (via `APP_GUARD` in Plan 05's
  `AppModule`) — every route requires a valid session **by default**.
  Public routes (register, login, catalogue browsing, public listing
  pages) opt out explicitly with `@Public()`, so a developer has to make a
  conscious choice to expose something, not the reverse.
- `@CurrentUser()` resolves to a typed `{ id, email, isAdmin, ... }` object
  pulled from the verified session — modules never re-parse a cookie/token
  themselves.
- Resource-level ownership checks (e.g. "only this listing's seller can
  edit it") are **not** generic — each owning module (Plan 11, 23, etc.)
  writes its own explicit check using `@CurrentUser()`, because "who owns
  this" means something different per entity and a generic ownership guard
  would hide that logic rather than clarify it.

## 6. Forms (this plan is the first real consumer of Plan 04's pattern)

Schemas added to `packages/validation` (per Plan 03's conventions):
`RegisterRequestSchema`, `LoginRequestSchema`, `ForgotPasswordRequestSchema`,
`ResetPasswordRequestSchema` — each with inline, user-facing Zod messages
(§8 of Plan 03) so the `<FormField>` component from Plan 04 renders them
correctly with no extra mapping.

Concrete behavior per Plan 04's rules:

- Password field validates strength (min length, etc.) live, error shown
  below the field as soon as it's touched — no waiting for submit.
- Confirm-password mismatch shows inline on the confirm field the moment
  it diverges from the password field, not only on blur.
- Email-already-registered is the one case this plan deliberately routes
  as a **field error** (unlike login failures, §3) — during registration,
  confirming an email is taken is expected UX (the user typed their own
  email and needs to know to log in instead), unlike login where account
  existence must stay ambiguous.
- Successful registration/reset/verification actions fire a **toast**
  ("Verification email sent", "Password updated") per Plan 04 §7, never a
  blocking alert.

## 7. Web & mobile client wiring

- **Web**: Better Auth's React client (`authClient`) configured once in
  `apps/web`, exposing `useSession()` for guarded layouts/redirects and
  `authClient.signIn`/`signUp`/`signOut` methods called from the forms in
  §6.
- **Mobile**: Better Auth's Expo-oriented client, same method surface,
  backed by `expo-secure-store` for the bearer token (§3). Session
  restoration on app launch reads the stored token and revalidates it
  against the API before rendering any authenticated screen.
- Both clients share the `User`/`Session` **types** via `packages/types`
  (inferred from the Prisma models in §4), so "what a logged-in user looks
  like" is defined once, not per-platform.

## 8. Rate limiting & abuse hardening (extends Plan 05's global default)

Tighter, endpoint-specific throttle rules layered on top of Plan 05's
global `ThrottlerGuard` default:

```text
POST /auth/sign-in            5 attempts / 15 min per IP+email
POST /auth/sign-up            10 / hour per IP
POST /auth/forgot-password     5 / hour per IP+email
```

Google OAuth callback and session-refresh routes are excluded from
per-attempt throttling (they're not credential-guessing surfaces).

## 9. Out of scope for this plan

- Apple login, MFA, additional OAuth providers → later, once V1 validates
  demand (per the stack doc's explicit deferral)
- Full role/permission system beyond the `isAdmin` boolean → revisit only
  when a second admin tier is actually needed
- Dealer multi-user/staff accounts under one dealer → **Plan 33**
- Fraud/suspicious-account detection → **Plan 31** (this plan only gates
  on verified email, per §3)
- Account deletion / GDPR data-erasure flow → **Plan 38** (this plan
  creates the account; deleting one is a separate, audited concern)

## 10. Acceptance criteria

- [x] Register with email/password creates a `User` row (verified for real:
      `usr_...`-prefixed, correctly persisted), sends a verification email
      (logged rather than actually delivered until real SMTP credentials
      exist — §11.1), and the account is unverified until the link is
      followed. Also, per §11.2: still unverified 7 days later locks the
      account out of every non-`@Public()` route (`EmailVerificationDeadlineGuard`,
      verified for real by backdating a test row's `createdAt`).
- [x] Login with correct credentials issues a session usable by both a web
      cookie and, separately, a mobile bearer token against the same
      account. Verified for real: the same session token worked as both a
      `Cookie` header and an `Authorization: Bearer` header against
      `POST /api/v1/listings`.
- [x] Login with incorrect credentials shows one generic toast, with no
      field-level error and identical wording regardless of whether the
      email exists.
- [x] Google login is fully wired (server `socialProviders.google` +
      "Continue with Google" on both clients) but not exercised against a
      real Google account — no Google Cloud OAuth app exists yet, per
      §11.3; it activates automatically once `GOOGLE_CLIENT_ID`/
      `GOOGLE_CLIENT_SECRET` are set.
- [x] Forgot-password → reset-password flow works end to end, including
      the inline password-strength/confirm-match validation from §6.
- [x] An unauthenticated request to a non-`@Public()` route returns 401 in
      the `ApiError` shape from Plan 03 (verified for real:
      `POST /api/v1/listings` with no session → 401 `UNAUTHORIZED`); a
      non-admin request to an `AdminGuard`-protected route returns 403
      (`admin.guard.test.ts`; no admin-protected route exists yet to
      exercise live — the first one Plan 09/28/32 add will be the live
      proof).
- [x] Attempting to create a listing (stubbed endpoint is fine at this
      stage) with an unverified email is rejected with a clear, toast-
      ready message. Verified for real: `{"code":"FORBIDDEN","message":"Verify
      your email to do this."}`.
- [x] Session persists across a web page reload (Better Auth's cookie) and
      a mobile app cold restart (`expo-secure-store` + `useSession()`'s
      `isPending` gate in `apps/mobile/app/_layout.tsx`) without
      re-prompting login.

## 11. Open questions for you — resolved 2026-09

1. **Not Resend — SMTP, added later.** `EmailService`
   (`apps/api/src/modules/auth/email/email.service.ts`) sends over SMTP via
   `nodemailer`, reading `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/
   `SMTP_PASSWORD`/`SMTP_SECURE`/`EMAIL_FROM` (`.env.example`, replacing this
   plan's original Resend-shaped `EMAIL_API_KEY`). Prep only for now, per
   your instruction: `SMTP_HOST` is blank until a real mailbox/relay exists,
   and `EmailService` logs the email instead of sending when it's unset —
   registration/reset-password work end-to-end locally without one. Setup
   steps for filling in real SMTP credentials once ready are in
   `.env.example`'s comment on those vars and
   `docs/deployment-runbook.md` §2.1.
2. **Confirmed, and stronger than §3's original proposal**: email
   verification is required **within 7 days of registration** to keep
   access to the app at all — not just to list/message. Two independent
   mechanisms, both in `apps/api/src/modules/auth/`:
   - `EmailVerifiedGuard` (§3's original gate, per-route) — blocks listing
     creation/messaging unconditionally for an unverified account, at any
     time. This plan's own stub proof is
     `apps/api/src/modules/listings/listings.controller.ts` (Plan 11
     replaces it with the real thing).
   - `EmailVerificationDeadlineGuard` (new, global `APP_GUARD`) — once 7
     days pass since `User.createdAt` with `emailVerified` still `false`,
     every non-`@Public()` route is rejected (403) until the account is
     verified. `@Public()` routes (register/login/forgot-password/verify-
     email/...) stay reachable regardless, so a locked-out user can still
     log in and resend the verification link.
   Saving/watching stay ungated, as §3 originally proposed — not extended.
3. **No existing Google Cloud OAuth app — prep only, added later.** The
   `google` social provider (`auth-instance.ts`) is only registered once
   both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are non-empty; both are
   blank in `.env.example` today, so this is a safe no-op until real
   credentials exist. The "Continue with Google" button is still wired on
   both clients (§7) — it just surfaces a toast instead of succeeding until
   then. Setup steps for creating the OAuth app and its redirect URI are in
   `.env.example`'s comment on these vars.
4. **Confirmed** — a plain `isAdmin: Boolean` on `User`, no roles table.

## 12. Deviations from this plan worth flagging

- **`prisma/schema/auth.prisma`'s `Account`/`Session`/`Verification` models
  are hand-written, not produced by `better-auth generate`** as §4
  originally planned. The standalone `@better-auth/cli` package is
  deprecated upstream and doesn't resolve this monorepo's
  `@vehicles-marketplace/*` workspace imports out of the box. Instead, the
  exact field/table shape was read directly out of the installed
  `better-auth`/`@better-auth/core` packages' own schema-building source
  (`getAuthTables()` in `@better-auth/core`) — the same source of truth the
  generator itself introspects — then mapped to this repo's snake_case-
  column convention like every other model. `User` also gained an
  `image String? @map("image_url")` column beyond §4's literal snippet:
  Better Auth's core user schema always includes an avatar field (populated
  by Google's profile picture on social sign-in); there was no way to omit
  it, only rename its storage column, which this does.
- **IDs**: confirmed the app-generated prefixed-ULID strategy (Plan 03 §5)
  applies to Better Auth's own tables too (`usr_`, `ses_`, `acc_`, `ver_`),
  via `advanced.database.generateId` in `auth-instance.ts` — deliberately
  `database.generateId`, not the top-level `advanced.generateId`: confirmed
  against the installed adapter factory source that only the former is
  consulted for a plain row `create()` (the latter is a separate hook a
  handful of call sites check *first*, which would have silently taken
  priority if both were set).
- **§6's registration schema has no "name" field**, even though Better
  Auth's core `name` attribute is required input on every sign-up call.
  Rather than add a field the plan didn't ask for, both clients derive a
  starting display name from the email's local part
  (`deriveDisplayNameFromEmail` in `@vehicles-marketplace/utils`) and remap
  Better Auth's `name` attribute onto the `displayName` column
  (`user.fields.name` in `auth-instance.ts`) — editable later from account
  settings, out of scope here.
- **§8's rate limiting is two layers, not one.** Better Auth's own built-in
  limiter ships a hardcoded default for `/sign-in*`/`/sign-up*` (3 requests
  per 10 seconds, keyed by IP+path) that's *stricter* than §8's intended
  numbers but on a much shorter window — spread out slowly, it would allow
  far more than "5 attempts/15 min" long-term. `rateLimit.customRules` in
  `auth-instance.ts` loosens that built-in default to a generous IP-only
  ceiling; the actual §8 numbers (5/15min sign-in, 10/hour sign-up, 5/hour
  forgot-password) are enforced precisely by a custom `hooks.before`
  (`auth-rate-limit.hook.ts`) keyed by **IP+email**, using the shared Redis
  client (`common/redis/redis.module.ts`, new — `@Global()`, same pattern
  as `DbModule`). IP+email rather than IP-only was a deliberate choice: an
  IP-only limit at those exact numbers would let one attacker's failed
  attempts against *one* email lock out every other user sharing that IP
  (corporate NAT, a mobile carrier, ...) from signing in to their own,
  unrelated accounts.
- **`GET /api/v1/health` and the wildcard `NotFoundFallbackController` are
  now `@Public()`.** Both predate this plan's global `AuthGuard`; without
  the decorator, deploy scripts polling `/health` (Plan 02/35) would get 401
  instead of an answer, and a typo'd URL from an unauthenticated caller
  would get a misleading 401 instead of the 404 that's actually true.
- **`/api/v1/auth/*` is mounted as raw Express middleware in `main.ts`
  (`mountAuthHandler`), not a Nest `@Controller()`**, despite
  `auth.controller.ts`'s filename matching §5's literal tree. Better Auth's
  handler (`better-call`) reads the raw, unparsed request body stream
  itself; Nest's default global body parser would already have consumed it
  by the time any controller ran. Nest's `bodyParser: false` plus a raw
  `app.use()` mount before `express.json()`/`urlencoded()` (documented as
  the correct Nest integration shape upstream) is what actually works — see
  `auth.controller.ts`'s and `main.ts`'s comments. One real consequence:
  `/api/v1/auth/*` never reaches Nest's router at all, so it's inherently
  outside every Nest guard (`AuthGuard` included) — correct here, since
  every Better Auth endpoint must be reachable without an existing session,
  and its own endpoint-specific protections are wired into the Better Auth
  instance itself instead (the rate-limit hook above).
- **A throwaway `apps/api/src/modules/listings/` (`ListingsModule`,
  `POST /listings` guarded by `EmailVerifiedGuard`) was added** — not in
  the original plan, but needed to prove §10's "attempting to create a
  listing with an unverified email is rejected" acceptance criterion for
  real, the same way Plan 05's `HealthModule` was a throwaway proof of its
  own pipeline. Plan 11 deletes/replaces it with the real Listings module.
- **`packages/config`'s `EnvSchema` gained `AUTH_SECRET` (required, no
  default — booting with a blank secret would sign every session with a
  well-known empty value), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
  `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_SECURE`, and
  `EMAIL_FROM`** (all optional, defaulting to blank/prep-safe values) — see
  §11.1/§11.3. `apps/worker`'s `vitest.setup.ts` needed a schema-valid
  `AUTH_SECRET` placeholder alongside its existing `DATABASE_URL`/
  `REDIS_URL` ones, for the same reason those exist: `WorkerModule` shares
  this schema wholesale even though the worker process never reads
  `AUTH_SECRET` itself.
- **`apps/web` and `apps/mobile` gained their first real env vars**
  (`NEXT_PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL` — the Better Auth clients'
  base URL) and, following Plan 05's `apps/api` precedent, their `dev`
  script now loads root `.env.local` via `dotenv-cli` too. **Deliberately
  not `apps/web`'s `build` script**: `.env.local` also sets
  `NODE_ENV=development`, and letting that leak into a *production*
  `next build` (confirmed by reproducing it) causes a Turbopack prerender
  crash on unrelated pages — `next build` needs Next's own production
  `NODE_ENV`, not a dev-convenience override. `docker/web.Dockerfile` gained
  a build-time `ARG NEXT_PUBLIC_API_URL` (Next inlines `NEXT_PUBLIC_*` at
  build time, not runtime) sourced from `docker-compose.yml`'s new
  `build.args`, itself reading whatever `--env-file` the `docker compose`
  invocation was given — no per-environment override needed.
- **`apps/api` gained `express` as a direct dependency** (previously only a
  transitive one via `@nestjs/platform-express`) — `main.ts` now imports
  `json`/`urlencoded` from it directly for the reason above, and this
  repo's strict pnpm linking doesn't resolve undeclared dependencies.
