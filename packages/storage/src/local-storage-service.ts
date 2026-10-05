/**
 * plans/12-image-upload-processing-pipeline.md §2/§4 — the V1 implementation
 * of `StorageService`, writing under `UPLOAD_ROOT` (Plan 02) on the local
 * filesystem. `path` keys are always forward-slash-separated (see
 * `storage-service.ts`); `join()` below maps that onto whatever separator
 * the host OS actually uses.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StorageService } from './storage-service';

export interface LocalStorageServiceOptions {
  /** Absolute (or process-relative) directory everything is written under — never exposed to callers, who only ever see storage-relative `path` keys. */
  uploadRoot: string;
  /** Public base URL the Local layout is served from (see `.env.example`'s `PUBLIC_UPLOAD_URL`) — no trailing slash. */
  publicUploadUrl: string;
}

export class LocalStorageService implements StorageService {
  constructor(private readonly options: LocalStorageServiceOptions) {}

  async upload(file: Buffer, path: string): Promise<{ path: string; url: string }> {
    const fullPath = this.resolve(path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);
    return { path, url: this.getUrl(path) };
  }

  async download(path: string): Promise<Buffer> {
    return readFile(this.resolve(path));
  }

  async delete(path: string): Promise<void> {
    // `force: true` — deleting an already-missing file (e.g. a retried
    // cleanup, or a variant that never finished writing) is a no-op, not an
    // error (§10's "deleting a Media row removes its files" acceptance
    // criterion doesn't require every variant to already exist).
    await rm(this.resolve(path), { force: true });
  }

  getUrl(path: string): string {
    return `${this.options.publicUploadUrl}/${path}`;
  }

  private resolve(path: string): string {
    return join(this.options.uploadRoot, ...path.split('/'));
  }
}
