/**
 * plans/07-authentication-authorization.md §3/§5 —
 * `@UseGuards(AdminGuard)` requires `isAdmin`; runs after the global
 * `AuthGuard`, which has already attached `req.user` (or rejected the
 * request with 401) by the time this guard runs.
 */
import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
