/**
 * plans/12-image-upload-processing-pipeline.md §6/§7 — the seller photo
 * pipeline's HTTP-facing half: validate + store the original (converting
 * HEIC to JPEG first, per §3), enqueue the worker's resize/classify job,
 * and the rest of the Photo Manager's CRUD (reorder, manual category
 * override, delete, retry, coverage). Ownership is enforced via
 * `ListingsService.requireOwnedListingForMutation` (listing-scoped routes)
 * or by resolving a `Media` row to its listing first (`media`-scoped
 * routes) — every route in this module is owner/admin-only, matching its
 * framing as seller tooling, not buyer-facing listing data.
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import heicConvert from 'heic-convert';
import { db, type Media as MediaRow } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import {
  MediaCategorySchema,
  type CurrentUser as CurrentUserType,
  type Media,
  type MediaCategory,
  type MediaCoverage,
  MEDIA_COVERAGE_RECOMMENDED_MINIMUMS,
} from '@vehicles-marketplace/validation';
import type { StorageService } from '@vehicles-marketplace/storage';
import { STORAGE_SERVICE } from '../../common/storage/storage.tokens';
import { ListingsService } from '../listings/listings.service';
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  IMAGE_PROCESSING_JOB_OPTIONS,
  IMAGE_PROCESSING_QUEUE,
  MAX_PHOTOS_PER_LISTING,
  isHeicMimeType,
  type ImageProcessingJobData,
} from './media.constants';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly listingsService: ListingsService,
    @InjectQueue(IMAGE_PROCESSING_QUEUE)
    private readonly imageProcessingQueue: Queue<ImageProcessingJobData>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /** §6's upload step — HEIC is converted to JPEG here, before anything ever reaches storage or the worker, per §3's "do not rely on Sharp's native HEIC decode" decision. */
  async upload(
    currentUser: CurrentUserType,
    listingId: string,
    file: Express.Multer.File,
  ): Promise<Media> {
    await this.listingsService.requireOwnedListingForMutation(listingId, currentUser);

    if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(`Unsupported file type: ${file.mimetype}`);
    }

    const existingCount = await db.media.count({ where: { listingId } });
    if (existingCount >= MAX_PHOTOS_PER_LISTING) {
      throw new ConflictException(
        `A listing cannot have more than ${MAX_PHOTOS_PER_LISTING} photos.`,
      );
    }

    let buffer = file.buffer;
    let extension = EXTENSION_BY_MIME[file.mimetype] ?? '.jpg';
    if (isHeicMimeType(file.mimetype)) {
      buffer = Buffer.from(await heicConvert({ buffer: file.buffer, format: 'JPEG', quality: 1 }));
      extension = '.jpg';
    }

    const mediaId = createId('med');
    const originalPath = `listings/${listingId}/original/${mediaId}${extension}`;
    await this.storage.upload(buffer, originalPath);

    const media = await db.media.create({
      data: { id: mediaId, listingId, originalPath, position: existingCount },
    });

    await this.imageProcessingQueue.add('process', { mediaId }, IMAGE_PROCESSING_JOB_OPTIONS);

    return this.toMedia(media);
  }

  async list(currentUser: CurrentUserType, listingId: string): Promise<Media[]> {
    await this.listingsService.requireOwnedListingForMutation(listingId, currentUser);
    const rows = await db.media.findMany({ where: { listingId }, orderBy: { position: 'asc' } });
    return rows.map((row) => this.toMedia(row));
  }

  /** §3/§8 — always allowed, regardless of the photo's current `categorySource`/confidence. Clears `categoryConfidence` since it no longer reflects anything the AI reported. */
  async updateCategory(
    currentUser: CurrentUserType,
    mediaId: string,
    category: MediaCategory,
  ): Promise<Media> {
    await this.requireOwnedMedia(mediaId, currentUser);

    const updated = await db.media.update({
      where: { id: mediaId },
      data: { category, categorySource: 'SELLER_DECLARED', categoryConfidence: null },
    });
    return this.toMedia(updated);
  }

  async reorder(
    currentUser: CurrentUserType,
    listingId: string,
    mediaIds: string[],
  ): Promise<Media[]> {
    await this.listingsService.requireOwnedListingForMutation(listingId, currentUser);

    const existing = await db.media.findMany({ where: { listingId }, select: { id: true } });
    const existingIds = new Set(existing.map((row) => row.id));
    const isExactReorder =
      mediaIds.length === existing.length &&
      new Set(mediaIds).size === mediaIds.length &&
      mediaIds.every((id) => existingIds.has(id));
    if (!isExactReorder) {
      throw new BadRequestException(
        "mediaIds must list every one of this listing's photos exactly once.",
      );
    }

    await db.$transaction(
      mediaIds.map((id, position) => db.media.update({ where: { id }, data: { position } })),
    );

    return this.list(currentUser, listingId);
  }

  async remove(currentUser: CurrentUserType, mediaId: string): Promise<void> {
    const media = await this.requireOwnedMedia(mediaId, currentUser);

    await Promise.all(
      [media.originalPath, media.largePath, media.mediumPath, media.thumbnailPath]
        .filter((path): path is string => !!path)
        .map((path) => this.storage.delete(path)),
    );
    await db.media.delete({ where: { id: mediaId } });
  }

  /** §7 — re-enqueues a `FAILED` job; any other status is a no-op conflict (nothing to retry). */
  async retry(currentUser: CurrentUserType, mediaId: string): Promise<Media> {
    const media = await this.requireOwnedMedia(mediaId, currentUser);
    if (media.status !== 'FAILED') {
      throw new ConflictException('Only a failed photo can be retried.');
    }

    const updated = await db.media.update({
      where: { id: mediaId },
      data: { status: 'PENDING', errorMessage: null },
    });
    await this.imageProcessingQueue.add('process', { mediaId }, IMAGE_PROCESSING_JOB_OPTIONS);

    return this.toMedia(updated);
  }

  /** §7 — every `MediaCategory` is present in `counts`, even at zero, so a consumer never guards a missing key. */
  async coverage(currentUser: CurrentUserType, listingId: string): Promise<MediaCoverage> {
    await this.listingsService.requireOwnedListingForMutation(listingId, currentUser);

    const rows = await db.media.groupBy({
      by: ['category'],
      where: { listingId },
      _count: { _all: true },
    });

    const counts = Object.fromEntries(
      MediaCategorySchema.options.map((category) => [category, 0]),
    ) as Record<MediaCategory, number>;
    for (const row of rows) {
      if (row.category) counts[row.category] = row._count._all;
    }

    const missing = Object.entries(MEDIA_COVERAGE_RECOMMENDED_MINIMUMS)
      .filter(([category, minimum]) => counts[category as MediaCategory] < (minimum as number))
      .map(([category]) => category as MediaCategory);

    return { counts, missing };
  }

  /** `media`-scoped routes have no `listingId` in their path — resolve it from the `Media` row first, then apply the listing's own ownership rule (§3). 404s before 403s: a missing media id shouldn't be distinguishable from a foreign one. */
  private async requireOwnedMedia(
    mediaId: string,
    currentUser: CurrentUserType,
  ): Promise<MediaRow> {
    const media = await db.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    await this.listingsService.requireOwnedListingForMutation(media.listingId, currentUser);
    return media;
  }

  private toMedia(media: MediaRow): Media {
    return {
      id: media.id,
      listingId: media.listingId,
      category: media.category,
      categoryConfidence: media.categoryConfidence,
      categorySource: media.categorySource,
      status: media.status,
      errorMessage: media.errorMessage,
      originalUrl: this.storage.getUrl(media.originalPath),
      largeUrl: media.largePath ? this.storage.getUrl(media.largePath) : null,
      mediumUrl: media.mediumPath ? this.storage.getUrl(media.mediumPath) : null,
      thumbnailUrl: media.thumbnailPath ? this.storage.getUrl(media.thumbnailPath) : null,
      position: media.position,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }
}
