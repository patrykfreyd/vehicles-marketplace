/**
 * plans/12-image-upload-processing-pipeline.md §6 — the queue consumer:
 * Sharp resize into large/medium/thumbnail WebP, `VisionAiClient.classify`
 * on the medium variant, `Media.status` updated throughout. On failure this
 * rethrows so BullMQ's own retry/backoff (configured by the producer in
 * `apps/api/src/modules/media/media.constants.ts`) takes over; `Media.status`
 * only moves to `FAILED` once the final attempt has been exhausted, so the
 * UI doesn't show a transient retry as a hard failure.
 */
import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import type { StorageService } from '@vehicles-marketplace/storage';
import { DB } from '../../common/db/db.module';
import { STORAGE_SERVICE } from '../../common/storage/storage.tokens';
import {
  IMAGE_PROCESSING_QUEUE,
  IMAGE_VARIANTS,
  WEBP_QUALITY,
  resolveClassifiedCategory,
  type ImageProcessingJobData,
} from './image-processing.constants';
import type { VisionAiClient } from './vision-ai/vision-ai-client';
import { VISION_AI_CLIENT } from './vision-ai/vision-ai-client.tokens';

@Processor(IMAGE_PROCESSING_QUEUE)
export class ImageProcessingProcessor extends WorkerHost {
  constructor(
    @Inject(DB) private readonly db: PrismaClient,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(VISION_AI_CLIENT) private readonly visionAi: VisionAiClient,
  ) {
    super();
  }

  async process(job: Job<ImageProcessingJobData>): Promise<void> {
    const { mediaId } = job.data;
    const media = await this.db.media.findUniqueOrThrow({ where: { id: mediaId } });

    await this.db.media.update({ where: { id: mediaId }, data: { status: 'PROCESSING' } });

    try {
      const original = await this.storage.download(media.originalPath);

      const variantPaths: Partial<Record<(typeof IMAGE_VARIANTS)[number]['key'], string>> = {};
      let mediumBuffer: Buffer | undefined;

      for (const variant of IMAGE_VARIANTS) {
        const buffer = await sharp(original)
          .rotate()
          .resize({ width: variant.width, withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        const path = `listings/${media.listingId}/${variant.key}/${mediaId}.webp`;
        await this.storage.upload(buffer, path);
        variantPaths[variant.key] = path;
        if (variant.key === 'medium') mediumBuffer = buffer;
      }

      const classification = await this.visionAi.classify(mediumBuffer as Buffer);

      await this.db.media.update({
        where: { id: mediaId },
        data: {
          status: 'DONE',
          largePath: variantPaths.large,
          mediumPath: variantPaths.medium,
          thumbnailPath: variantPaths.thumbnail,
          category: resolveClassifiedCategory(classification),
          categoryConfidence: classification.confidence,
          categorySource: 'AI_DETECTED',
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const totalAttempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= totalAttempts;
      if (isFinalAttempt) {
        await this.db.media.update({
          where: { id: mediaId },
          data: { status: 'FAILED', errorMessage: message },
        });
      }
      throw error;
    }
  }
}
