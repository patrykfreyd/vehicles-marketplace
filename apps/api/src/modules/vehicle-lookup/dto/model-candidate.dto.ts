import { createZodDto } from 'nestjs-zod';
import {
  ListModelCandidatesQuerySchema,
  ModelCandidateSchema,
  PageResponseSchema,
} from '@vehicles-marketplace/validation';

export class ListModelCandidatesQueryDto extends createZodDto(ListModelCandidatesQuerySchema) {}
export class ModelCandidatePageDto extends createZodDto(PageResponseSchema(ModelCandidateSchema)) {}
