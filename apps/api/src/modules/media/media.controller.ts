/**
 * plans/12-image-upload-processing-pipeline.md §7 — the full endpoint table.
 * Routes mix two URL shapes (`listings/:id/media...` and `media/:id...`), so
 * this controller has no single `@Controller(prefix)` — each route states
 * its full path, matching §7's table exactly. Every route is mutating or
 * seller-only reading, so `EmailVerifiedGuard` applies throughout (Plan 07
 * §3's "verified-email gating" row) except the two read-only `GET`s, which
 * stay reachable by any authenticated (not necessarily verified) owner/admin
 * — consistent with `ListingsController.getById`.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { MediaCoverageDto, MediaDto, MediaListDto } from './dto/media.dto';
import { ReorderMediaRequestDto } from './dto/reorder-media.dto';
import { UpdateMediaCategoryRequestDto } from './dto/update-media-category.dto';
import { MAX_UPLOAD_BYTES } from './media.constants';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post('listings/:id/media')
  @UseGuards(EmailVerifiedGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ZodResponse({ status: 201, type: MediaDto })
  async upload(
    @CurrentUser() user: CurrentUserType,
    @Param('id') listingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upload(user, listingId, file);
  }

  @Get('listings/:id/media')
  @ZodResponse({ status: 200, type: MediaListDto })
  async list(@CurrentUser() user: CurrentUserType, @Param('id') listingId: string) {
    return this.service.list(user, listingId);
  }

  @Get('listings/:id/media/coverage')
  @ZodResponse({ status: 200, type: MediaCoverageDto })
  async coverage(@CurrentUser() user: CurrentUserType, @Param('id') listingId: string) {
    return this.service.coverage(user, listingId);
  }

  @Patch('listings/:id/media/reorder')
  @UseGuards(EmailVerifiedGuard)
  @ZodResponse({ status: 200, type: MediaListDto })
  async reorder(
    @CurrentUser() user: CurrentUserType,
    @Param('id') listingId: string,
    @Body() body: ReorderMediaRequestDto,
  ) {
    return this.service.reorder(user, listingId, body.mediaIds);
  }

  @Patch('media/:id')
  @UseGuards(EmailVerifiedGuard)
  @ZodResponse({ status: 200, type: MediaDto })
  async updateCategory(
    @CurrentUser() user: CurrentUserType,
    @Param('id') mediaId: string,
    @Body() body: UpdateMediaCategoryRequestDto,
  ) {
    return this.service.updateCategory(user, mediaId, body.category);
  }

  @Delete('media/:id')
  @UseGuards(EmailVerifiedGuard)
  @HttpCode(204)
  async remove(@CurrentUser() user: CurrentUserType, @Param('id') mediaId: string) {
    await this.service.remove(user, mediaId);
  }

  @Post('media/:id/retry')
  @UseGuards(EmailVerifiedGuard)
  @HttpCode(200)
  @ZodResponse({ status: 200, type: MediaDto })
  async retry(@CurrentUser() user: CurrentUserType, @Param('id') mediaId: string) {
    return this.service.retry(user, mediaId);
  }
}
