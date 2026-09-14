/**
 * plans/07-authentication-authorization.md §3 — web session transport is an
 * HttpOnly cookie scoped to the parent domain (`.{domain}`) so `api.{domain}`
 * and `{domain}` share one session, "placeholder until [Plan 02's domain
 * question is] answered." Returns `undefined` for `localhost` (Local dev —
 * no cross-subdomain cookie needed, and browsers reject a `Domain=localhost`
 * attribute anyway), and `.{hostname}` for anything else — including the
 * `example.co.uk` placeholder Plan 02 uses throughout Test/Production's
 * Caddyfiles today. Swap nothing here once a real domain lands; `APP_URL`
 * already carries it.
 */
export function cookieDomainForAppUrl(appUrl: string): string | undefined {
  let hostname: string;
  try {
    hostname = new URL(appUrl).hostname;
  } catch {
    return undefined;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }

  return `.${hostname}`;
}
