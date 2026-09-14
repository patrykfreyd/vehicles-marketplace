/**
 * Runtime config loader/validator. Plan 02 owns the real environment
 * variable contract (.env.example, secrets, per-environment behavior);
 * this schema is extended by whichever plan first actually reads a given
 * variable, rather than each app inventing its own ad hoc `process.env`
 * read. Plan 05 (Backend API Foundation) is the first consumer beyond the
 * trivial `NODE_ENV` field Plan 01 proved the pattern with, so it adds the
 * variables `apps/api`/`apps/worker` need to boot: the app-wide
 * environment discriminator, the port apps/api binds to, and the
 * Postgres/Redis/CORS values the health checks and HTTP hardening depend
 * on. Auth/email/AI/DVLA secrets stay out of this schema until the plan
 * that first uses each (07, 12, 14, 10) adds it.
 */
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Project's own environment discriminator — see .env.example and the
  // root README's "APP_ENV vs NODE_ENV" section. App code should branch on
  // this, never on NODE_ENV alone.
  APP_ENV: z.enum(['local', 'test', 'production']).default('local'),

  // Address other services/clients use to reach web/api respectively —
  // distinct from the PORT apps/api binds to below. Used to build the CORS
  // allowlist and (API_URL) as the default base URL for generated clients.
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Port apps/api actually binds to (see apps/api/src/main.ts).
  PORT: z.coerce.number().int().positive().default(3001),

  // Required, no default: booting without a real Postgres/Redis target
  // should fail loudly rather than silently pointing at nothing.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Basic-auth credentials gating Swagger UI in Test (see
  // apps/api/src/swagger.ts) — unused (and unnecessary) in Local/Production.
  SWAGGER_USER: z.string().optional(),
  SWAGGER_PASSWORD: z.string().optional(),

  // --- Plan 07 (Authentication & Authorization) ---
  // Better Auth's session/cookie-signing secret. Required, no default — an
  // app booting with a blank secret would sign every session with a
  // well-known empty value, which is worse than failing to boot at all.
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),

  // Google OAuth (§11.3 — prep only): left blank until real credentials
  // exist. auth-instance.ts only registers the `google` social provider
  // when both are non-empty, so booting without them is a no-op, not an
  // error — see docs/deployment-runbook.md's setup step for how to obtain
  // real values later.
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  // SMTP (§11.1 — prep only, replacing Plan 02's placeholder Resend-shaped
  // `EMAIL_API_KEY`): left blank until a real mailbox/relay exists.
  // EmailService falls back to logging the email instead of sending when
  // SMTP_HOST is unset — see apps/api/src/modules/auth/email/email.service.ts
  // and docs/deployment-runbook.md's setup step.
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  EMAIL_FROM: z.string().default('Vehicles Marketplace <no-reply@example.co.uk>'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parses and validates `process.env` (or a supplied object) against `EnvSchema`. */
export function loadEnv(env: Record<string, string | undefined> = process.env): Env {
  return EnvSchema.parse(env);
}
