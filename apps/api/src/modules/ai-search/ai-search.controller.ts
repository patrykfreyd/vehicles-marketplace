import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import {
  AiMessageRequestSchema,
  AiMessageResponseSchema,
  type CurrentUser as User,
} from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { AiSearchThrottleGuard } from './ai-search-throttle.guard';
import { AiSearchService } from './ai-search.service';

export class AiMessageRequestDto extends createZodDto(AiMessageRequestSchema) {}
export class AiMessageResponseDto extends createZodDto(AiMessageResponseSchema) {}

@Controller('ai-search')
@UseGuards(EmailVerifiedGuard, AiSearchThrottleGuard)
export class AiSearchController {
  constructor(private readonly service: AiSearchService) {}

  @Post('message')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AiMessageResponseDto })
  message(@CurrentUser() user: User, @Body() body: AiMessageRequestDto) {
    return this.service.message(user.id, 'AI_SEARCH', body);
  }

  @Post('car-finder/message')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AiMessageResponseDto })
  carFinder(@CurrentUser() user: User, @Body() body: AiMessageRequestDto) {
    return this.service.message(user.id, 'AI_CAR_FINDER', body);
  }
}
