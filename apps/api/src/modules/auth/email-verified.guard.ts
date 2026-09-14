/**
 * plans/07-authentication-authorization.md §3's "Verified-email gating" row
 * — require a verified email before creating a listing or sending a
 * message; not required to browse, search, save, or watch. Per-route via
 * `@UseGuards(EmailVerifiedGuard)`, applied by whichever plan owns those
 * endpoints (Plan 11 listings, Plan 25 messaging) — see
 * apps/api/src/modules/listings/listings.controller.ts for this plan's own
 * stubbed proof (§10's acceptance criterion).
 *
 * Distinct from `EmailVerificationDeadlineGuard`: this blocks two specific
 * actions unconditionally for an unverified user; that one blocks the whole
 * app once 7 days pass without verifying (§11.2).
 */
import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user?.emailVerified) {
      throw new ForbiddenException('Verify your email to do this.');
    }
    return true;
  }
}
