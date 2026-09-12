import type { HealthCheck } from '@vehicles-marketplace/validation';

/** Pure display helper, split out from the page component so it's testable
 * without a DOM/React-rendering harness. */
export function buildHealthMessage(health: HealthCheck): string {
  return `Web app is alive. Health check: ${health.status} @ ${health.timestamp}`;
}
