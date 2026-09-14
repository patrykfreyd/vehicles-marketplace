import { createZodDto } from 'nestjs-zod';
import {
  AddAliasRequestSchema,
  AddSourceRequestSchema,
  DerivativeDetailSchema,
  MergeDerivativesRequestSchema,
  UpdateDerivativeRequestSchema,
} from '@vehicles-marketplace/catalogue-types';

export class DerivativeDetailDto extends createZodDto(DerivativeDetailSchema) {}
export class UpdateDerivativeRequestDto extends createZodDto(UpdateDerivativeRequestSchema) {}
export class AddAliasRequestDto extends createZodDto(AddAliasRequestSchema) {}
export class AddSourceRequestDto extends createZodDto(AddSourceRequestSchema) {}
export class MergeDerivativesRequestDto extends createZodDto(MergeDerivativesRequestSchema) {}
