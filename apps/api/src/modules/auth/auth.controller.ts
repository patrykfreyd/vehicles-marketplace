/**
 * plans/07-authentication-authorization.md §3/§5 — "wildcard route
 * delegating to Better Auth's Node handler."
 *
 * Deliberately *not* a Nest `@Controller()` class, despite the plan's file
 * tree naming this `auth.controller.ts`: Better Auth's handler (`better-
 * call`) reads the raw, unparsed request body stream itself, but Nest's
 * default Express adapter applies a global `express.json()`/`urlencoded()`
 * body parser *before* any controller runs — by the time a Nest route
 * handler saw the request, the stream would already be consumed and
 * `req.body` already parsed into a plain object Better Auth never reads.
 * The documented fix (Better Auth's own Nest integration guide) is to
 * disable Nest's global body parser and mount the raw handler as Express
 * middleware *before* re-adding `express.json()` for every other route —
 * see main.ts, which calls `mountAuthHandler` before `app.use(json())`.
 * Mounted this way, `/api/v1/auth/*` also never reaches Nest's router at
 * all, so it's inherently outside every Nest guard (including the global
 * `AuthGuard`/`ThrottlerGuard`) — correct here, since every Better Auth
 * endpoint is meant to be reachable without an existing session, and its
 * own endpoint-specific protections (§8's rate limiting) are wired directly
 * into the Better Auth instance instead (auth-rate-limit.hook.ts).
 */
import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { AUTH_BASE_PATH, type Auth } from './auth-instance';

export function mountAuthHandler(app: INestApplication, auth: Auth): void {
  // Express 5's catch-all syntax — a bare trailing `*` is rejected by its
  // (path-to-regexp-based) router; a named wildcard is required instead.
  app.use(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));
}
