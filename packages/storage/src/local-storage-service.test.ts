import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageService } from './local-storage-service';

describe('LocalStorageService', () => {
  let uploadRoot: string;
  let service: LocalStorageService;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'storage-test-'));
    service = new LocalStorageService({
      uploadRoot,
      publicUploadUrl: 'http://localhost:3001/uploads',
    });
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('writes a file under uploadRoot, creating intermediate directories', async () => {
    const result = await service.upload(Buffer.from('hello'), 'listings/lst1/original/med1.jpg');

    expect(result.path).toBe('listings/lst1/original/med1.jpg');
    expect(result.url).toBe('http://localhost:3001/uploads/listings/lst1/original/med1.jpg');
    const written = await readFile(join(uploadRoot, 'listings', 'lst1', 'original', 'med1.jpg'));
    expect(written.toString()).toBe('hello');
  });

  it('downloads bytes previously uploaded', async () => {
    await service.upload(Buffer.from('round-trip'), 'listings/lst1/original/med1.jpg');
    const bytes = await service.download('listings/lst1/original/med1.jpg');
    expect(bytes.toString()).toBe('round-trip');
  });

  it('deletes a file', async () => {
    await service.upload(Buffer.from('x'), 'listings/lst1/original/med1.jpg');
    await service.delete('listings/lst1/original/med1.jpg');
    await expect(service.download('listings/lst1/original/med1.jpg')).rejects.toThrow();
  });

  it('deleting a file that was never written is a no-op', async () => {
    await expect(service.delete('listings/lst1/original/missing.jpg')).resolves.toBeUndefined();
  });

  it('builds a public URL without reading the filesystem', () => {
    expect(service.getUrl('listings/lst1/medium/med1.webp')).toBe(
      'http://localhost:3001/uploads/listings/lst1/medium/med1.webp',
    );
  });
});
