import { createZodDto } from 'nestjs-zod';
import {
  ManufacturerListQuerySchema,
  ManufacturerSummarySchema,
} from '@vehicles-marketplace/catalogue-types';
import { PageResponseSchema } from '@vehicles-marketplace/validation';

export class ManufacturerSummaryDto extends createZodDto(ManufacturerSummarySchema) {}
export class ManufacturerListQueryDto extends createZodDto(ManufacturerListQuerySchema) {}
export class ManufacturerSummaryPageDto extends createZodDto(
  PageResponseSchema(ManufacturerSummarySchema),
) {}
