import { describe, expect, it } from 'vitest';
import { DvlaLookupRequestSchema } from './dvla-lookup-request';

describe('DvlaLookupRequestSchema', () => {
  it('accepts and normalizes a registration', () => {
    const result = DvlaLookupRequestSchema.safeParse({ registration: 'ya22 gzx' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.registration).toBe('YA22GZX');
  });

  it('rejects a missing registration', () => {
    expect(DvlaLookupRequestSchema.safeParse({}).success).toBe(false);
  });
});
