import { createZodDto } from 'nestjs-zod';
import { DvlaLookupRequestSchema, DvlaLookupResultSchema } from '@vehicles-marketplace/validation';

export class DvlaLookupRequestDto extends createZodDto(DvlaLookupRequestSchema) {}
export class DvlaLookupResultDto extends createZodDto(DvlaLookupResultSchema) {}
