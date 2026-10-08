import { createZodDto } from 'nestjs-zod';
import { SearchRequestSchema, SearchResponseSchema } from '@vehicles-marketplace/validation';

export class SearchRequestDto extends createZodDto(SearchRequestSchema) {}
export class SearchResponseDto extends createZodDto(SearchResponseSchema) {}
