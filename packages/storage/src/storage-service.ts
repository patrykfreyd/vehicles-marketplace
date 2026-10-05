/**
 * plans/12-image-upload-processing-pipeline.md §4 — the one seam both
 * `apps/api` (original upload) and `apps/worker` (variant writes, and
 * reading the original back to generate them from) go through, so a later
 * move to S3 (Plan 02 §36 Stage 2) is a new implementation of this
 * interface, not a rewrite of either app.
 *
 * Every `path` is a storage-relative, forward-slash-separated key (e.g.
 * `listings/<id>/original/<mediaId>.jpg`) — never an absolute filesystem
 * path and never OS-specific, so the same key works unchanged against a
 * future S3 implementation.
 *
 * `download` isn't in the plan doc's own interface sketch (§4 only lists
 * `upload`/`delete`/`getUrl`), but the worker has no other sanctioned way to
 * read the original bytes it resizes — reading `UPLOAD_ROOT` off the
 * filesystem directly in the worker would bypass this abstraction entirely,
 * defeating the point of it being swappable.
 */
export interface StorageService {
  upload(file: Buffer, path: string): Promise<{ path: string; url: string }>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
