/**
 * plans/10-dvla-lookup-seller-matching.md §3/§8 — the actual real-vs-fake
 * selection, factored out of `vehicle-lookup.module.ts`'s `useFactory` so
 * it's unit-testable directly (same reasoning as `auth-rate-limit.hook.ts`
 * factoring `checkAuthRateLimit` out of `createAuthMiddleware(...)`).
 */
import type { DvlaClient } from './dvla-client';
import { FakeDvlaClient } from './dvla-client.fake';
import { DvlaHttpClient } from './dvla-client.http';

export interface DvlaClientFactoryOptions {
  apiKey: string;
  baseUrl: string;
}

export function buildDvlaClient(options: DvlaClientFactoryOptions): DvlaClient {
  if (!options.apiKey) return new FakeDvlaClient();
  return new DvlaHttpClient({ apiKey: options.apiKey, baseUrl: options.baseUrl });
}
