import { createZodDto } from 'nestjs-zod';
import { CreateListingRequestSchema } from '@vehicles-marketplace/validation';

export class CreateListingRequestDto extends createZodDto(CreateListingRequestSchema) {}
