import { z } from 'zod';
import { MediaCategorySchema } from '../enums/media-category';

/**
 * plans/12-image-upload-processing-pipeline.md §3/§8 — the seller's manual
 * category override, always allowed regardless of the AI's confidence or
 * what it originally decided. The service sets `categorySource` to
 * `SELLER_DECLARED` whenever this is applied (never passed in the body —
 * the caller can't claim an override came from the AI).
 */
export const UpdateMediaCategoryRequestSchema = z.object({
  category: MediaCategorySchema,
});

export type UpdateMediaCategoryRequest = z.infer<typeof UpdateMediaCategoryRequestSchema>;
