import { createZodDto } from 'nestjs-zod';
import {
  CreateVehicleModificationRequestSchema,
  VehicleModificationItemSchema,
} from '@vehicles-marketplace/validation';

export class CreateVehicleModificationRequestDto extends createZodDto(
  CreateVehicleModificationRequestSchema,
) {}
export class VehicleModificationItemDto extends createZodDto(VehicleModificationItemSchema) {}
