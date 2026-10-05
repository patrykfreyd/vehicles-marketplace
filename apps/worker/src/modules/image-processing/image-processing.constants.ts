/**
 * plans/12-image-upload-processing-pipeline.md §6 — must match the string
 * `apps/api/src/modules/media/media.constants.ts` enqueues jobs onto
 * exactly (the two apps are separate processes, so there's no shared
 * module to import this from).
 */
import type { MediaCategory } from '@vehicles-marketplace/validation';

export const IMAGE_PROCESSING_QUEUE = 'image-processing';

export interface ImageProcessingJobData {
  mediaId: string;
}

/** §3's "AI classification confidence" decision — below this, the processor stores `OTHER` instead of the AI's guessed category, though the real confidence value is still recorded. */
export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.7;

/** §2's three generated variants, widest dimension in px — `fit: 'inside'`/`withoutEnlargement` (processor) means a smaller original is never upscaled. */
export const IMAGE_VARIANTS = [
  { key: 'large', width: 1600 },
  { key: 'medium', width: 900 },
  { key: 'thumbnail', width: 400 },
] as const;

export const WEBP_QUALITY = 82;

/**
 * §3's "AI classification confidence" decision, extracted into a pure
 * function so it's unit-testable without a real DB/Redis/Sharp pipeline —
 * see `image-processing.constants.test.ts`.
 */
export function resolveClassifiedCategory(classification: {
  category: MediaCategory;
  confidence: number;
}): MediaCategory {
  return classification.confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD
    ? 'OTHER'
    : classification.category;
}
