import { createZodDto } from 'nestjs-zod';
import { ManufacturerDetailSchema } from '@vehicles-marketplace/catalogue-types';

export class ManufacturerDetailDto extends createZodDto(ManufacturerDetailSchema) {}
