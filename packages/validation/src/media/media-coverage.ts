import { z } from 'zod';
import { MediaCategorySchema } from '../enums/media-category';

/**
 * plans/12-image-upload-processing-pipeline.md §7 — the mockup's "Photo
 * checklist"/"AI tips" feature: a count per category plus which categories
 * are below the recommended minimum (`RECOMMENDED_MINIMUMS` below — the
 * service is the one source of truth for it, not duplicated client-side).
 * `counts` always has every `MediaCategory` key, even ones with zero
 * photos, so a consumer never has to guard a missing key.
 */
export const MediaCoverageSchema = z.object({
  counts: z.record(MediaCategorySchema, z.number().int().min(0)),
  missing: z.array(MediaCategorySchema),
});

export type MediaCoverage = z.infer<typeof MediaCoverageSchema>;

/**
 * §7's "simple recommended-minimum table" — only the categories a seller is
 * actively steered toward photographing (DAMAGE/DOCUMENT/OTHER are
 * situational, never flagged "missing" no matter the count).
 */
export const MEDIA_COVERAGE_RECOMMENDED_MINIMUMS: Partial<
  Record<z.infer<typeof MediaCategorySchema>, number>
> = {
  EXTERIOR: 4,
  INTERIOR: 2,
  ENGINE: 1,
  BOOT: 1,
};
