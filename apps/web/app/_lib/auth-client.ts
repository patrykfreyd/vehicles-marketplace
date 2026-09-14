'use client';

/**
 * plans/07-authentication-authorization.md §7 — Better Auth's React client,
 * configured once. `useSession()` drives guarded layouts/redirects;
 * `authClient.signIn`/`signUp`/`signOut` are called directly from the forms
 * under app/(register|login|forgot-password|reset-password).
 *
 * Web session transport is a cookie (§3) — no plugin needed here, unlike
 * mobile's expo client (apps/mobile/lib/auth-client.ts), since a browser's
 * cookie jar already does the work `expoClient` does by hand on RN.
 */
import { createAuthClient } from 'better-auth/react';

// Next.js inlines NEXT_PUBLIC_* at build time; falls back to the Local API
// port so `pnpm dev` works even before .env.local is copied from the
// example (see .env.example's comment on this variable).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/v1/auth',
});

export const { useSession, signIn, signOut, signUp } = authClient;
