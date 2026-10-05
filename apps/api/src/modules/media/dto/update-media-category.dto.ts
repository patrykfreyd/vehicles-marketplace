import { createZodDto } from 'nestjs-zod';
import { UpdateMediaCategoryRequestSchema } from '@vehicles-marketplace/validation';

export class UpdateMediaCategoryRequestDto extends createZodDto(UpdateMediaCategoryRequestSchema) {}
