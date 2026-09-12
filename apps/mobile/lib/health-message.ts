import type { HealthCheck } from '@vehicles-marketplace/validation';

/** Pure display helper, split out from the screen component so it's
 * testable under plain Jest without a rendered React Native tree. */
export function buildHealthMessage(health: HealthCheck): string {
  return `Mobile app is alive. Health check: ${health.status} @ ${health.timestamp}`;
}
