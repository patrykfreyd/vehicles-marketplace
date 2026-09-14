/**
 * plans/05-backend-api-foundation.md §7's generated client, actually wired
 * up for the first time — the Catalogue Admin (Plan 09) is the first real
 * network consumer in `apps/web` (every earlier screen used
 * `authClient`/`@vehicles-marketplace/validation`'s local helpers only).
 *
 * `credentials: 'include'` — Better Auth's session is an HttpOnly cookie
 * (Plan 07 §3), scoped to `api.{domain}`; the browser only attaches it on a
 * cross-origin request when the fetch explicitly asks for credentials,
 * matching the API's own `enableCors({ credentials: true })`.
 */
import { createApiClient } from '@vehicles-marketplace/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = createApiClient({ baseUrl: API_URL, credentials: 'include' });
