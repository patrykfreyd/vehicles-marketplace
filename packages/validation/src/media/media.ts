import { z } from 'zod';
import { EquipmentSourceSchema } from '../enums/equipment-source';
import { MediaCategorySchema } from '../enums/media-category';
import { MediaStatusSchema } from '../enums/media-status';

/**
 * plans/12-image-upload-processing-pipeline.md §5/§7 — a single photo. Every
 * `*Url` is a fully-qualified URL built by the service from the DB's
 * storage-relative `*Path` columns via `StorageService.getUrl()` — callers
 * never see a raw storage path, so the storage backend stays swappable
 * (§4) without changing this contract. `large`/`medium`/`thumbnailUrl` are
 * `null` until the worker finishes processing (`status` is `DONE`);
 * `originalUrl` is set immediately on upload, before any processing.
 *
 * `.min(1).nullable()` on every nullable string field — bare
 * `z.string().nullable()` breaks nestjs-zod's OpenAPI conversion (see
 * `vehicle-lookup/dvla-lookup-result.ts`'s comment on this).
 */
export const MediaSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),

  category: MediaCategorySchema.nullable(),
  categoryConfidence: z.number().min(0).max(1).nullable(),
  categorySource: EquipmentSourceSchema.nullable(),

  status: MediaStatusSchema,
  errorMessage: z.string().min(1).nullable(),

  originalUrl: z.string().min(1),
  largeUrl: z.string().min(1).nullable(),
  mediumUrl: z.string().min(1).nullable(),
  thumbnailUrl: z.string().min(1).nullable(),

  position: z.number().int().min(0),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type Media = z.infer<typeof MediaSchema>;
