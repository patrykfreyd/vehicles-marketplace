import { createZodDto } from 'nestjs-zod';
import {
  ConfirmVehicleLookupRequestSchema,
  ConfirmVehicleLookupResponseSchema,
} from '@vehicles-marketplace/validation';

export class ConfirmVehicleLookupRequestDto extends createZodDto(
  ConfirmVehicleLookupRequestSchema,
) {}
export class ConfirmVehicleLookupResponseDto extends createZodDto(
  ConfirmVehicleLookupResponseSchema,
) {}
