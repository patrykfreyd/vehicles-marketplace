/**
 * plans/09-catalogue-import-tooling-admin.md §7 — every route behind
 * `AdminGuard` (Plan 07), backing the Catalogue Admin's read/edit/approve/
 * reject/merge/alias/source screens. Controllers depend only on their own
 * service (Plan 05 §5) — `CatalogueAdminService` owns every DB access.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import type { PageResponse } from '@vehicles-marketplace/validation';
import { AdminGuard } from '../auth/admin.guard';
import { CatalogueAdminService } from './catalogue-admin.service';
import {
  ManufacturerListQueryDto,
  ManufacturerSummaryPageDto,
} from './dto/manufacturer-summary.dto';
import { ManufacturerDetailDto } from './dto/manufacturer-detail.dto';
import { DuplicateGroupPageDto } from './dto/duplicate-group-page.dto';
import {
  AddAliasRequestDto,
  AddSourceRequestDto,
  DerivativeDetailDto,
  MergeDerivativesRequestDto,
  UpdateDerivativeRequestDto,
} from './dto/derivative-detail.dto';

function toPage<T>(items: T[]): PageResponse<T> {
  return { items, page: 1, pageSize: items.length, total: items.length, totalPages: 1 };
}

@Controller('catalogue-admin')
@UseGuards(AdminGuard)
export class CatalogueAdminController {
  constructor(private readonly service: CatalogueAdminService) {}

  @Get('manufacturers')
  @ZodResponse({ status: 200, type: ManufacturerSummaryPageDto })
  async listManufacturers(@Query() query: ManufacturerListQueryDto) {
    const manufacturers = await this.service.listManufacturers(query.sort);
    return toPage(manufacturers);
  }

  @Get('manufacturers/:makeId')
  @ZodResponse({ status: 200, type: ManufacturerDetailDto })
  async getManufacturer(@Param('makeId') makeId: string) {
    const detail = await this.service.getManufacturerDetail(makeId);
    if (!detail) throw new NotFoundException('Manufacturer not found');
    return detail;
  }

  @Get('manufacturers/:makeId/duplicates')
  @ZodResponse({ status: 200, type: DuplicateGroupPageDto })
  async getDuplicates(@Param('makeId') makeId: string) {
    const groups = await this.service.findDuplicates(makeId);
    return toPage(groups);
  }

  @Get('derivatives/:id')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async getDerivative(@Param('id') id: string) {
    const detail = await this.service.getDerivativeDetail(id);
    if (!detail) throw new NotFoundException('Derivative not found');
    return detail;
  }

  @Patch('derivatives/:id')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async updateDerivative(@Param('id') id: string, @Body() body: UpdateDerivativeRequestDto) {
    return this.service.updateDerivative(id, body);
  }

  @Post('derivatives/:id/approve')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async approveDerivative(@Param('id') id: string) {
    return this.service.approveDerivative(id);
  }

  @Post('derivatives/:id/reject')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async rejectDerivative(@Param('id') id: string) {
    return this.service.rejectDerivative(id);
  }

  @Post('derivatives/:id/merge')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async mergeDerivative(@Param('id') id: string, @Body() body: MergeDerivativesRequestDto) {
    return this.service.mergeDerivatives(id, body.duplicateId);
  }

  @Post('derivatives/:id/aliases')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async addAlias(@Param('id') id: string, @Body() body: AddAliasRequestDto) {
    return this.service.addAlias(id, body.alias);
  }

  @Delete('aliases/:aliasId')
  @HttpCode(204)
  async removeAlias(@Param('aliasId') aliasId: string): Promise<void> {
    await this.service.removeAlias(aliasId);
  }

  @Post('derivatives/:id/sources')
  @ZodResponse({ status: 200, type: DerivativeDetailDto })
  async addSource(@Param('id') id: string, @Body() body: AddSourceRequestDto) {
    return this.service.addSource(id, body);
  }

  @Delete('derivative-sources/:id')
  @HttpCode(204)
  async removeSource(@Param('id') id: string): Promise<void> {
    await this.service.removeSource(id);
  }
}
