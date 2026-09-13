import { All, Controller, NotFoundException } from '@nestjs/common';

/**
 * Without this, a request to a route no controller claims never reaches
 * Nest's exception-handling pipeline at all — Express's own fallback
 * responds with its default HTML "Cannot GET /..." page, not our
 * `ApiErrorSchema` shape (verified while testing this plan: `GET
 * /api/v1/does-not-exist` returned that HTML page, breaking §4's "every
 * error response" guarantee). Registered last (§9) so every real route
 * still matches first; this only catches what's left.
 */
@Controller()
export class NotFoundFallbackController {
  @All('*path')
  handle(): never {
    throw new NotFoundException('Not found');
  }
}
