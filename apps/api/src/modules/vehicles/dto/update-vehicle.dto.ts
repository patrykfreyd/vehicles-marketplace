import { createZodDto } from 'nestjs-zod';
import { UpdateVehicleRequestSchema } from '@vehicles-marketplace/validation';

export class UpdateVehicleRequestDto extends createZodDto(UpdateVehicleRequestSchema) {}
