/**
 * plans/10-dvla-lookup-seller-matching.md §5 — every route requires an
 * authenticated, verified-email session (global `AuthGuard` handles
 * "authenticated"; `EmailVerifiedGuard` here adds "verified-email", per §3's
 * "Access scope" decision — this is a sell-flow-only feature, never a
 * general public "look up any registration" tool).
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ConfirmVehicleLookupRequestDto, ConfirmVehicleLookupResponseDto } from './dto/confirm.dto';
import {
  DerivativeCandidatePageDto,
  ListDerivativeCandidatesQueryDto,
} from './dto/derivative-candidate.dto';
import { DvlaLookupRequestDto, DvlaLookupResultDto } from './dto/dvla-lookup.dto';
import { ListModelCandidatesQueryDto, ModelCandidatePageDto } from './dto/model-candidate.dto';
import { DvlaLookupThrottleGuard } from './dvla-lookup-throttle.guard';
import { VehicleLookupService } from './vehicle-lookup.service';

@Controller('vehicle-lookup')
@UseGuards(EmailVerifiedGuard)
export class VehicleLookupController {
  constructor(private readonly service: VehicleLookupService) {}

  @Post('dvla')
  @UseGuards(DvlaLookupThrottleGuard)
  @ZodResponse({ status: 201, type: DvlaLookupResultDto })
  async lookupDvla(@CurrentUser() user: CurrentUserType, @Body() body: DvlaLookupRequestDto) {
    return this.service.lookupByRegistration(user.id, body.registration);
  }

  @Get(':id/model-candidates')
  @ZodResponse({ status: 200, type: ModelCandidatePageDto })
  async listModelCandidates(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Query() query: ListModelCandidatesQueryDto,
  ) {
    return this.service.listModelCandidates(user.id, id, query);
  }

  @Get(':id/derivative-candidates')
  @ZodResponse({ status: 200, type: DerivativeCandidatePageDto })
  async listDerivativeCandidates(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Query() query: ListDerivativeCandidatesQueryDto,
  ) {
    return this.service.listDerivativeCandidates(user.id, id, query);
  }

  @Post(':id/confirm')
  @ZodResponse({ status: 200, type: ConfirmVehicleLookupResponseDto })
  async confirm(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: ConfirmVehicleLookupRequestDto,
  ) {
    return this.service.confirm(user.id, id, body);
  }
}
