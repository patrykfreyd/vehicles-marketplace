import { createZodDto } from 'nestjs-zod';
import { MediaCoverageSchema, MediaSchema } from '@vehicles-marketplace/validation';
import { z } from 'zod';

export class MediaDto extends createZodDto(MediaSchema) {}
export class MediaListDto extends createZodDto(z.array(MediaSchema)) {}
export class MediaCoverageDto extends createZodDto(MediaCoverageSchema) {}
