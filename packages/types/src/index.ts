/**
 * Shared domain TS types, consumed by web/api/mobile without any build step
 * (see packages/tsconfig and the root README for how source-only packages
 * are resolved). Real domain types (Vehicle, Listing, User, ...) land here
 * as later plans introduce them — this file just proves the package boots
 * and is importable end-to-end.
 */

/** Branded string ID so different entity IDs can't be swapped by accident. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

/** Status reported by every app/service's health-check endpoint. */
export type HealthStatus = 'ok' | 'error';
