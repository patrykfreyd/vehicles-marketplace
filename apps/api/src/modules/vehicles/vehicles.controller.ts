/**
 * plans/11-vehicle-listing-data-model.md §8 — every route is part of the
 * sell flow (a `Vehicle` only ever comes from a confirmed `VehicleLookup`,
 * itself gated behind `EmailVerifiedGuard` in Plan 10), so the whole
 * controller is gated the same way as `VehicleLookupController`.
 */
import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import type { CurrentUser as CurrentUserType } from '@vehicles-marketplace/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { CreateVehicleRequestDto } from './dto/create-vehicle.dto';
import { UpdateVehicleRequestDto } from './dto/update-vehicle.dto';
import { VehicleDto } from './dto/vehicle.dto';
import {
  AddVehicleEquipmentRequestDto,
  VehicleEquipmentItemDto,
} from './dto/vehicle-equipment.dto';
import {
  CreateVehicleModificationRequestDto,
  VehicleModificationItemDto,
} from './dto/vehicle-modification.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(EmailVerifiedGuard)
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  @Post()
  @ZodResponse({ status: 201, type: VehicleDto })
  async create(@CurrentUser() user: CurrentUserType, @Body() body: CreateVehicleRequestDto) {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, type: VehicleDto })
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: UpdateVehicleRequestDto,
  ) {
    return this.service.update(user, id, body);
  }

  @Post(':id/equipment')
  @ZodResponse({ status: 201, type: VehicleEquipmentItemDto })
  async addEquipment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: AddVehicleEquipmentRequestDto,
  ) {
    return this.service.addEquipment(user, id, body);
  }

  @Delete(':id/equipment/:eqId')
  @HttpCode(204)
  async removeEquipment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('eqId') eqId: string,
  ) {
    await this.service.removeEquipment(user, id, eqId);
  }

  @Post(':id/modifications')
  @ZodResponse({ status: 201, type: VehicleModificationItemDto })
  async addModification(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: CreateVehicleModificationRequestDto,
  ) {
    return this.service.addModification(user, id, body);
  }

  @Delete(':id/modifications/:modId')
  @HttpCode(204)
  async removeModification(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('modId') modId: string,
  ) {
    await this.service.removeModification(user, id, modId);
  }
}
