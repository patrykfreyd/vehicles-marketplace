import { createZodDto } from 'nestjs-zod';
import { VehicleSchema } from '@vehicles-marketplace/validation';

export class VehicleDto extends createZodDto(VehicleSchema) {}
