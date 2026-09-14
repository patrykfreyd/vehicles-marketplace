import { Controller, Get, Query } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/public.decorator';
import { CatalogueService } from './catalogue.service';
import {
  ListPublishedDerivativesQueryDto,
  PublishedDerivativePageDto,
} from './dto/published-derivative.dto';

// plans/09-catalogue-import-tooling-admin.md §9's acceptance-criterion
// stand-in for Plan 13's future search — public (no session required),
// browsing the catalogue is never gated per Plan 07's conventions.
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly service: CatalogueService) {}

  @Public()
  @Get('derivatives')
  @ZodResponse({ status: 200, type: PublishedDerivativePageDto })
  async listDerivatives(@Query() query: ListPublishedDerivativesQueryDto) {
    return this.service.listPublishedDerivatives(query);
  }
}
