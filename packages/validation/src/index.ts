/**
 * Shared Zod schemas — the source of truth for validation across web, api,
 * and mobile. Real domain schemas (Vehicle, Listing, ...) land here as later
 * plans introduce them (see Plan 03). For now this holds one real, working
 * example: the health-check payload, imported by both apps/web and
 * apps/api so that Plan 01's acceptance criteria proves cross-package
 * imports work end-to-end, not just on paper.
 */
import { z } from 'zod';
import type { HealthStatus } from '@vehicles-marketplace/types';

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string().datetime(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// Compile-time check that the schema's inferred status stays in sync with
// the shared `HealthStatus` type from @vehicles-marketplace/types.
type _AssertStatusMatches = HealthCheck['status'] extends HealthStatus ? true : never;
const _assertStatusMatches: _AssertStatusMatches = true;
void _assertStatusMatches;

/** Builds a validated "everything's fine" health-check payload. */
export function createHealthCheck(): HealthCheck {
  return HealthCheckSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
