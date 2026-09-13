/**
 * Thin, typed wrapper around `openapi-fetch` (§7's client-generation
 * decision) — every app imports `createApiClient` instead of hand-writing
 * fetch calls, and gets full request/response type inference for free from
 * `./generated/schema`, which is regenerated from `apps/api`'s live routes
 * whenever a Zod schema or endpoint changes.
 *
 * Regenerate after any such change:
 *   pnpm generate:api-client
 * (from the repo root — runs `apps/api`'s `generate:openapi` first, then
 * `openapi-typescript` here; see package.json in both places.)
 */
import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './generated/schema';

export type { paths } from './generated/schema';

export function createApiClient(options: ClientOptions) {
  return createClient<paths>(options);
}
