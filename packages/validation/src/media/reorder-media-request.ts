import { z } from 'zod';

/** plans/12-image-upload-processing-pipeline.md §7 — bulk position update; `mediaIds` is the new order, index 0 first. */
export const ReorderMediaRequestSchema = z.object({
  mediaIds: z.array(z.string().min(1)).min(1, 'mediaIds must not be empty'),
});

export type ReorderMediaRequest = z.infer<typeof ReorderMediaRequestSchema>;
