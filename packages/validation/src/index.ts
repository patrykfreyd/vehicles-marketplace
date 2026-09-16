/**
 * Shared Zod schemas — the source of truth for validation across web, api,
 * and mobile (see plans/03-shared-types-validation.md §2: a schema is
 * always written once, here; its type is always derived with `z.infer`,
 * never hand-duplicated in `@vehicles-marketplace/types`).
 *
 * The cross-cutting common/enum schemas below are Plan 03's content.
 * Everything domain-specific (Vehicle, Listing, ...) lands here as later
 * plans introduce them, following the same conventions.
 */
import { z } from 'zod';

export * from './auth/current-user';
export * from './auth/forgot-password-request';
export * from './auth/login-request';
export * from './auth/password';
export * from './auth/register-request';
export * from './auth/reset-password-request';
export * from './common/errors';
export * from './common/health';
export * from './common/money';
export * from './common/pagination';
export * from './enums/body-style';
export * from './enums/drivetrain';
export * from './enums/fuel';
export * from './enums/transmission';
export * from './demo/contact-form';
export * from './vehicle-lookup/registration';
export * from './vehicle-lookup/dvla-lookup-request';
export * from './vehicle-lookup/dvla-lookup-result';
export * from './vehicle-lookup/model-candidate';
export * from './vehicle-lookup/derivative-candidate';
export * from './vehicle-lookup/confirm';

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string().datetime(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

/**
 * `@vehicles-marketplace/types` re-exports this alongside the schema's own
 * type, following §2's rule (schema lives here, type is derived once).
 * Dependencies only ever point `types` -> `validation`, never the reverse,
 * so the two packages don't form a cycle.
 */
export type HealthStatus = HealthCheck['status'];

/** Builds a validated "everything's fine" health-check payload. */
export function createHealthCheck(): HealthCheck {
  return HealthCheckSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
