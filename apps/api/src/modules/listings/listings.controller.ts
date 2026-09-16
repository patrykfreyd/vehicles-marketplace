/**
 * plans/11-vehicle-listing-data-model.md §8 — the real Listings module,
 * replacing Plan 07 §10's throwaway stub. `EmailVerifiedGuard` is applied
 * per mutating route (not class-wide) since reading a listing must stay
 * open to any authenticated user, verified or not — only creating/
 * mutating a listing is gated (Plan 07 §3's "Verified-email gating" row).
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CreateListingRequestDto } from './dto/create-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';
import { ListingDto, ListingPageDto } from './dto/listing.dto';
import { UpdateListingRequestDto } from './dto/update-listing.dto';
import { UpdateListingStatusRequestDto } from './dto/update-listing-status.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly service: ListingsService) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
  @ZodResponse({ status: 201, type: ListingDto })
  async create(@CurrentUser() user: CurrentUserType, @Body() body: CreateListingRequestDto) {
    return this.service.create(user, body);
  }

  @Get()
  @ZodResponse({ status: 200, type: ListingPageDto })
  async list(@CurrentUser() user: CurrentUserType, @Query() query: ListListingsQueryDto) {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ZodResponse({ status: 200, type: ListingDto })
  async getById(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Patch(':id')
  @UseGuards(EmailVerifiedGuard)
  @ZodResponse({ status: 200, type: ListingDto })
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: UpdateListingRequestDto,
  ) {
    return this.service.update(user, id, body);
  }

  @Post(':id/status')
  @UseGuards(EmailVerifiedGuard)
  @HttpCode(200)
  @ZodResponse({ status: 200, type: ListingDto })
  async updateStatus(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: UpdateListingStatusRequestDto,
  ) {
    return this.service.updateStatus(user, id, body.status);
  }
}
