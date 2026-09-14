import { describe, expect, it, vi } from 'vitest';

describe('db', () => {
  it('reuses the same PrismaClient instance across module reloads', async () => {
    const first = await import('./client');

    // Simulates `node --watch` hot-reloading apps/api/apps/worker's entry
    // module: the `./client` module itself gets re-evaluated, but
    // `globalThis.__prisma` survives, so the fallback (`globalThis.__prisma
    // ?? new PrismaClient()`) must pick the old instance back up instead of
    // silently opening a second connection pool.
    vi.resetModules();
    const second = await import('./client');

    expect(second.db).toBe(first.db);
    expect(globalThis.__prisma).toBe(first.db);
  });
});
