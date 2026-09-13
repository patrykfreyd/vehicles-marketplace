/**
 * Environment-driven CORS allowlist (§3's HTTP-hardening decision):
 * `APP_URL` (the web app) plus mobile's Expo scheme.
 *
 * CORS is a browser-enforced mechanism — a native app's own `fetch` never
 * sends an `Origin` header, so this entry is inert for the actual Expo app
 * on a device; it's listed anyway so a browser-based Expo preview (Expo
 * web, or Metro's own in-browser tooling) served from that scheme isn't
 * silently blocked. Keep this in sync with `apps/mobile/app.json`'s
 * `expo.scheme` if that ever changes.
 */
import type { Env } from '@vehicles-marketplace/config';

const MOBILE_APP_SCHEME_ORIGIN = 'vehiclesmarketplace://';

export function buildCorsOrigins(env: Pick<Env, 'APP_URL'>): string[] {
  return [env.APP_URL, MOBILE_APP_SCHEME_ORIGIN];
}
