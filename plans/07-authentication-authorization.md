# Plan 07 — Authentication & Authorization

Status: Draft
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

- [ ] Register with email/password creates a `User` row, sends a real
      verification email via Resend (sandbox/test recipient restriction in
      Test/Local per Plan 02 §... email policy), and the account is
      unverified until the link is followed.
- [ ] Login with correct credentials issues a session usable by both a web
      cookie and, separately, a mobile bearer token against the same
      account.
- [ ] Login with incorrect credentials shows one generic toast, with no
      field-level error and identical wording regardless of whether the
      email exists.
- [ ] Google login creates or matches a `User` correctly in Local (using a
      real Google OAuth test app — see open question 3).
- [ ] Forgot-password → reset-password flow works end to end, including
      the inline password-strength/confirm-match validation from §6.
- [ ] An unauthenticated request to a non-`@Public()` route returns 401 in
      the `ApiError` shape from Plan 03; a non-admin request to an
      `AdminGuard`-protected route returns 403.
- [ ] Attempting to create a listing (stubbed endpoint is fine at this
      stage) with an unverified email is rejected with a clear, toast-
      ready message.
- [ ] Session persists across a web page reload and a mobile app cold
      restart without re-prompting login.

## 11. Open questions for you

1. Confirm **Resend** as the email provider, or do you already have one
   you'd prefer (e.g. Postmark, SES)?
2. Confirm requiring verified email before listing/messaging (§3) — too
   strict, about right, or should it also gate saving/watching?
3. Do you already have a Google Cloud OAuth app/credentials, or does this
   plan need to include creating one as a setup step?
4. Confirm the `isAdmin` boolean is sufficient for V1 rather than
   designing a roles table now.
