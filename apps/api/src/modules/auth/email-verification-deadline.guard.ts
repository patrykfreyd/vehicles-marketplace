/**
 * plans/07-authentication-authorization.md §11.2 — "we'll require email
 * verification that needs to be done within 7 days from registration to
 * keep access to the app": registered globally (`APP_GUARD`, after
 * `AuthGuard`), so once the deadline passes an unverified user is rejected
 * from every non-`@Public()` route, not just listing/messaging (that
 * narrower gate is `EmailVerifiedGuard`).
 *
 * `@Public()` routes (register/login/forgot-password/reset-password/verify-
 * email, catalogue browsing, ...) stay reachable regardless — including for
 * a locked-out user, since they still need to be able to log in and resend
 * the verification email. Only checks the database for a user who is (a)
 * authenticated and (b) still unverified, so an already-verified request
 * never pays for the extra query.
 */
import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { DB } from '../../common/db/db.module';

export const EMAIL_VERIFICATION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class EmailVerificationDeadlineGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    // No user on the request means either @Public() (AuthGuard never ran
    // the session check) or, in principle, a route not covered at all —
    // either way there's nothing to gate here.
    if (!user || user.emailVerified) return true;

    const row = await this.db.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true },
    });
    if (!row) return true; // a stale session for a since-deleted user — AuthGuard's own check is the real gate for that

    const deadline = row.createdAt.getTime() + EMAIL_VERIFICATION_GRACE_PERIOD_MS;
    if (Date.now() > deadline) {
      throw new ForbiddenException(
        'Verify your email to keep using your account — check your inbox for the link, or request a new one.',
      );
    }
    return true;
  }
}
