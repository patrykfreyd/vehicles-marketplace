/**
 * Throwaway stub, not a real Listings module — Plan 11 owns that. This
 * exists only to prove plans/07-authentication-authorization.md §10's
 * acceptance criterion: "Attempting to create a listing (stubbed endpoint
 * is fine at this stage) with an unverified email is rejected with a
 * clear, toast-ready message." Delete this file once Plan 11 lands a real
 * `POST /listings` guarded by its own `EmailVerifiedGuard` usage.
 */
import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';

@Controller('listings')
export class ListingsController {
  @Post()
  @HttpCode(201)
  @UseGuards(EmailVerifiedGuard)
  create(@CurrentUser() user: CurrentUserType): { sellerId: string } {
    return { sellerId: user.id };
  }
}
