import { createZodDto } from 'nestjs-zod';
import { UpdateListingRequestSchema } from '@vehicles-marketplace/validation';

export class UpdateListingRequestDto extends createZodDto(UpdateListingRequestSchema) {}
