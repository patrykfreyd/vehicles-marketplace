/**
 * plans/07-authentication-authorization.md §5 — `@CurrentUser()` resolves to
 * a typed `{ id, email, isAdmin, ... }` object pulled from the verified
 * session; modules never re-parse a cookie/token themselves.
 */
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // AuthGuard runs globally and always sets req.user before a handler
      // is reached, unless the route is @Public() — using @CurrentUser() on
      // a @Public() route is a mistake in the route itself, not something
      // to silently return undefined for.
      throw new Error(
        '@CurrentUser() used on a route with no authenticated user — remove @Public() or add AuthGuard.',
      );
    }
    return request.user;
  },
);
