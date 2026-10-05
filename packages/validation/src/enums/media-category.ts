import { z } from 'zod';

/** idea doc §13 / plans/12-image-upload-processing-pipeline.md §2's photo taxonomy. */
export const MediaCategorySchema = z.enum([
  'EXTERIOR',
  'INTERIOR',
  'ENGINE',
  'BOOT',
  'DAMAGE',
  'DOCUMENT',
  'OTHER',
]);

export type MediaCategory = z.infer<typeof MediaCategorySchema>;
