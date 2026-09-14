/**
 * plans/07-authentication-authorization.md §3/§7 — mobile session transport
 * is Better Auth's bearer-token mode (session token in the `Authorization`
 * header, not a cookie — RN has no shared cookie jar the way a browser
 * does), persisted in `expo-secure-store`. `@better-auth/expo`'s client
 * plugin is what actually does this: it stores the session cookie value in
 * SecureStore and attaches it as a Bearer token on every request; the
 * server's `bearer()` plugin (auth-instance.ts) is what accepts that header
 * back as a valid session — the two are a matched pair.
 *
 * Session restoration on app launch (§7: "reads the stored token and
 * revalidates it against the API before rendering any authenticated
 * screen") is `useSession()`'s own `isPending` state — see app/_layout.tsx.
 */
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';

// Expo inlines EXPO_PUBLIC_* at bundle time; falls back to the Local API
// port the same way apps/web's client does.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/v1/auth',
  plugins: [
    expoClient({
      scheme: 'vehiclesmarketplace', // matches apps/mobile/app.json's expo.scheme
      storagePrefix: 'vehiclesmarketplace',
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
