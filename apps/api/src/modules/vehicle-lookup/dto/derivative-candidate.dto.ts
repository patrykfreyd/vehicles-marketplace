import { createZodDto } from 'nestjs-zod';
import {
  DerivativeCandidateSchema,
  ListDerivativeCandidatesQuerySchema,
  PageResponseSchema,
} from '@vehicles-marketplace/validation';

export class ListDerivativeCandidatesQueryDto extends createZodDto(
  ListDerivativeCandidatesQuerySchema,
) {}
export class DerivativeCandidatePageDto extends createZodDto(
  PageResponseSchema(DerivativeCandidateSchema),
) {}
