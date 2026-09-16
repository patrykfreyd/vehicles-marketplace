import { createZodDto } from 'nestjs-zod';
import { UpdateListingStatusRequestSchema } from '@vehicles-marketplace/validation';

export class UpdateListingStatusRequestDto extends createZodDto(UpdateListingStatusRequestSchema) {}
