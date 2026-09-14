import { All, Controller, NotFoundException } from '@nestjs/common';
import { Public } from '../../modules/auth/public.decorator';

/**
 * Without this, a request to a route no controller claims never reaches
 * Nest's exception-handling pipeline at all — Express's own fallback
 * responds with its default HTML "Cannot GET /..." page, not our
 * `ApiErrorSchema` shape (verified while testing this plan: `GET
 * /api/v1/does-not-exist` returned that HTML page, breaking §4's "every
 * error response" guarantee). Registered last (§9) so every real route
 * still matches first; this only catches what's left.
 *
 * `@Public()` (Plan 07): a nonexistent route should answer 404 regardless
 * of auth state — an unauthenticated request to a typo'd path shouldn't get
 * a misleading 401 instead of the 404 that's actually true here.
 */
@Controller()
export class NotFoundFallbackController {
  @Public()
  @All('*path')
  handle(): never {
    throw new NotFoundException('Not found');
  }
}
