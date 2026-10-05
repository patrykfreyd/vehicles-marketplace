/**
 * plans/12-image-upload-processing-pipeline.md §3 — "Upload limits" decision.
 * `IMAGE_PROCESSING_QUEUE` must match the string
 * `apps/worker/src/modules/image-processing/image-processing.constants.ts`
 * consumes exactly (separate processes, no shared module for this one
 * string). `IMAGE_PROCESSING_JOB_OPTIONS` is set here, at the producer —
 * BullMQ's retry/backoff is per-job, decided when a job is added, not by
 * the consumer.
 */
export const IMAGE_PROCESSING_QUEUE = 'image-processing';

export interface ImageProcessingJobData {
  mediaId: string;
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTOS_PER_LISTING = 30;

export const ACCEPTED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
export function isHeicMimeType(mimeType: string): boolean {
  return HEIC_MIME_TYPES.has(mimeType);
}

/** §6 — "3 attempts, exponential backoff". */
export const IMAGE_PROCESSING_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};
