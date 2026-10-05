import { z } from 'zod';

/** plans/12-image-upload-processing-pipeline.md §6 — a `Media` row's upload/processing lifecycle. */
export const MediaStatusSchema = z.enum(['PENDING', 'PROCESSING', 'DONE', 'FAILED']);

export type MediaStatus = z.infer<typeof MediaStatusSchema>;
