/**
 * Small cross-app helpers with no framework dependencies. Grows as later
 * plans need genuinely shared, trivial logic — kept deliberately tiny here.
 */

/** Exhaustiveness helper for switch/if-else chains over a union type. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

/** Type guard for a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
