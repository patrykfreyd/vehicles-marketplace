/**
 * The shape of `GET /api/v1/health`'s success body (see
 * plans/05-backend-api-foundation.md §9) — one Terminus health-check result
 * (`@nestjs/terminus`'s `HealthCheckResult`), re-declared here as a Zod
 * schema so the endpoint can prove it validates its own response, and so
 * `apps/api`'s DTO (`createZodDto(ApiHealthCheckSchema)`) drives the
 * Swagger schema instead of a hand-written one.
 *
 * This is distinct from `HealthCheckSchema`/`createHealthCheck` in
 * `./index.ts`, which is a trivial "this static render is alive" helper
 * `apps/web`/`apps/mobile` use standalone, with no backend involved.
 */
import { z } from 'zod';

export const HealthIndicatorStatusSchema = z.enum(['up', 'degraded', 'down']);

/** One indicator's entry in `info`/`error`/`details` — always a status, plus
 * whatever extra diagnostic fields that indicator attached (e.g. a
 * `message` on failure). */
const HealthIndicatorEntrySchema = z
  .object({ status: HealthIndicatorStatusSchema })
  .catchall(z.unknown());

const HealthIndicatorResultSchema = z.record(z.string(), HealthIndicatorEntrySchema);

export const ApiHealthCheckSchema = z.object({
  status: z.enum(['ok', 'error', 'degraded', 'shutting_down']),
  info: HealthIndicatorResultSchema.optional(),
  error: HealthIndicatorResultSchema.optional(),
  details: HealthIndicatorResultSchema,
});

export type ApiHealthCheck = z.infer<typeof ApiHealthCheckSchema>;
