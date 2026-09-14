/**
 * plans/07-authentication-authorization.md §3/§5 — registered globally
 * (`APP_GUARD` in app.module.ts): every route requires a valid session by
 * default, verified by wrapping Better Auth's own `getSession` call rather
 * than re-implementing cookie/bearer-token parsing. `@Public()` opts a
 * route out explicitly (public.decorator.ts).
 */
import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import type { Auth } from './auth-instance';
import { AUTH } from './auth.tokens';
import { toCurrentUser } from './current-user.mapper';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = toCurrentUser(session.user);
    return true;
  }
}
