import { createZodDto } from 'nestjs-zod';
import { DuplicateGroupResponseSchema } from '@vehicles-marketplace/catalogue-types';
import { PageResponseSchema } from '@vehicles-marketplace/validation';

// §4's "list endpoints return PageResponseSchema, never a bare array" —
// applied even though this result isn't really paginated (a make has, at
// most, a few dozen candidate groups): consistency with every other list
// endpoint's shape beats a one-off bare array here.
export class DuplicateGroupPageDto extends createZodDto(
  PageResponseSchema(DuplicateGroupResponseSchema),
) {}
