/**
 * Builds the single Better Auth server instance used by every other piece
 * of this module — the wildcard handler mount (auth.controller.ts) and
 * `AuthGuard`'s session verification both go through the same instance, per
 * plans/07-authentication-authorization.md §3's "mount Better Auth's
 * request handler ... wrap its session-verification call in a NestJS
 * AuthGuard" decision.
 */
import type { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins/bearer';
import type { Redis } from 'ioredis';
import { createId } from '@vehicles-marketplace/utils';
import type { Env } from '@vehicles-marketplace/config';
import { buildAuthRateLimitHook } from './auth-rate-limit.hook';
import { cookieDomainForAppUrl } from './cookie-domain';
import type { EmailService } from './email/email.service';

export const AUTH_BASE_PATH = '/api/v1/auth';

export type AuthInstanceEnv = Pick<
  Env,
  'AUTH_SECRET' | 'APP_URL' | 'API_URL' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'
>;

// Every model Better Auth's Prisma adapter manages, mapped to this repo's
// prefixed-ULID ID strategy (Plan 03 §5) instead of Better Auth's own
// default ID shape — matches prisma/schema/auth.prisma's own comment on why
// these tables are hand-written rather than CLI-generated.
function generateAuthId(model: string): string {
  switch (model) {
    case 'user':
      return createId('usr');
    case 'session':
      return createId('ses');
    case 'account':
      return createId('acc');
    case 'verification':
      return createId('ver');
    default:
      return createId('ba');
  }
}

export function createAuthInstance(
  env: AuthInstanceEnv,
  db: PrismaClient,
  emailService: EmailService,
  redis: Redis,
) {
  const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const cookieDomain = cookieDomainForAppUrl(env.APP_URL);

  return betterAuth({
    baseURL: env.API_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: prismaAdapter(db, { provider: 'postgresql' }),

    advanced: {
      // Deliberately `advanced.database.generateId`, not the top-level
      // `advanced.generateId` — confirmed against the installed
      // `@better-auth/core`'s adapter factory (`get-id-field.mjs`): the
      // generic adapter's own default `id` value (what actually runs for a
      // plain `create()`, i.e. every real sign-up/session/account row) only
      // consults `advanced.database.generateId`. The top-level
      // `advanced.generateId` is a separate hook a handful of call sites
      // (the sign-up route's synthetic-duplicate-user response, e.g.) check
      // *first* and would silently take priority over this if both were
      // set, which is more surface than this needs — one place is enough.
      database: {
        generateId: ({ model }: { model: string }) => generateAuthId(model),
      },
      // §3's web cookie-domain decision — undefined (same-site default) on
      // `localhost`, `.{domain}` once a real domain exists. See
      // cookie-domain.ts.
      ...(cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } : {}),
    },

    // Registration (§6) collects only email/password — `name` is Better
    // Auth's own required core field, remapped onto the `displayName`
    // column (see prisma/schema/user.prisma's comment) rather than adding a
    // form field the plan didn't ask for; both clients derive a starting
    // value via `deriveDisplayNameFromEmail`. `isAdmin` (§3's admin
    // decision) is a plain additional field, never client-settable.
    user: {
      fields: { name: 'displayName' },
      additionalFields: {
        isAdmin: { type: 'boolean', input: false, defaultValue: false },
      },
    },

    emailAndPassword: {
      enabled: true,
      // §3's verified-email gating is enforced per-route (EmailVerifiedGuard
      // for listing/messaging) and by the 7-day account-wide deadline
      // (EmailVerificationDeadlineGuard), not by blocking sign-in itself —
      // an unverified user must still be able to log back in to see the
      // "verify your email" prompt and resend the link.
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await emailService.sendPasswordResetEmail(user.email, url);
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await emailService.sendVerificationEmail(user.email, url);
      },
    },

    // §11.3 — prep only: registering the `google` provider with an empty
    // clientId/clientSecret would just warn on every boot for no benefit,
    // so it's left out entirely until real credentials exist (setup step —
    // see .env.example).
    ...(googleConfigured
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          },
        }
      : {}),

    // §8's exact sign-in/sign-up/forgot-password numbers (5/15min, 10/hour,
    // 5/hour) are enforced by `auth-rate-limit.hook.ts` instead of here,
    // keyed by IP+email rather than IP alone — an IP-only limit at those
    // numbers would let one attacker's failed attempts against ONE email
    // lock out every other user sharing that IP (corporate NAT, a mobile
    // carrier, ...) from signing in to their own, unrelated accounts.
    // `customRules` below only *loosens* Better Auth's own built-in default
    // for these three paths (3 requests/10s, IP+path-keyed — see
    // `getDefaultSpecialRules()` in its own `api/rate-limiter` source) up to
    // a generous IP-only ceiling, so a legitimate user isn't blocked by the
    // stricter built-in window before the intended IP+email rule ever gets
    // a say; `window`/`max` below remain the catch-all for every other auth
    // endpoint (get-session, sign-out, ...).
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 30 },
        '/sign-up/email': { window: 60, max: 30 },
        '/request-password-reset': { window: 60, max: 30 },
      },
    },
    hooks: { before: buildAuthRateLimitHook(redis) },

    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof createAuthInstance>;
