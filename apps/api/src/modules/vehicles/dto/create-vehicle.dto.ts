import { createZodDto } from 'nestjs-zod';
import { CreateVehicleRequestSchema } from '@vehicles-marketplace/validation';

export class CreateVehicleRequestDto extends createZodDto(CreateVehicleRequestSchema) {}
