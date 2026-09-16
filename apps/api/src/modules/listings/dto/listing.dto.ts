import { createZodDto } from 'nestjs-zod';
import { ListingSchema, PageResponseSchema } from '@vehicles-marketplace/validation';

export class ListingDto extends createZodDto(ListingSchema) {}
export class ListingPageDto extends createZodDto(PageResponseSchema(ListingSchema)) {}
