import { createZodDto } from 'nestjs-zod';
import { ListListingsQuerySchema } from '@vehicles-marketplace/validation';

export class ListListingsQueryDto extends createZodDto(ListListingsQuerySchema) {}
