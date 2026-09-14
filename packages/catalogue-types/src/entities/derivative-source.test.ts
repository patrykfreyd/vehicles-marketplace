import { describe, expect, it } from 'vitest';
import { DerivativeSourceSchema } from './derivative-source';

describe('DerivativeSourceSchema', () => {
  it('accepts a bare join row with no expanded source', () => {
    const result = DerivativeSourceSchema.safeParse({
      id: 'dsrc_01HZX82K7Q4M',
      derivativeId: 'bmw-m4-g82-competition-xdrive',
      sourceId: 'src_01HZX82K7Q4M',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an expanded source relation', () => {
    const result = DerivativeSourceSchema.safeParse({
      id: 'dsrc_01HZX82K7Q4M',
      derivativeId: 'bmw-m4-g82-competition-xdrive',
      sourceId: 'src_01HZX82K7Q4M',
      createdAt: '2026-09-14T00:00:00.000Z',
      source: {
        id: 'src_01HZX82K7Q4M',
        name: 'BMW UK press pack 2023',
        createdAt: '2026-09-14T00:00:00.000Z',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing derivativeId', () => {
    const result = DerivativeSourceSchema.safeParse({
      id: 'dsrc_01HZX82K7Q4M',
      sourceId: 'src_01HZX82K7Q4M',
      createdAt: '2026-09-14T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
