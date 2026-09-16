import { createZodDto } from 'nestjs-zod';
import {
  AddVehicleEquipmentRequestSchema,
  VehicleEquipmentItemSchema,
} from '@vehicles-marketplace/validation';

export class AddVehicleEquipmentRequestDto extends createZodDto(AddVehicleEquipmentRequestSchema) {}
export class VehicleEquipmentItemDto extends createZodDto(VehicleEquipmentItemSchema) {}
