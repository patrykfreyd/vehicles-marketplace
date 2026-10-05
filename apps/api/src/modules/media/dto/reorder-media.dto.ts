import { createZodDto } from 'nestjs-zod';
import { ReorderMediaRequestSchema } from '@vehicles-marketplace/validation';

export class ReorderMediaRequestDto extends createZodDto(ReorderMediaRequestSchema) {}
