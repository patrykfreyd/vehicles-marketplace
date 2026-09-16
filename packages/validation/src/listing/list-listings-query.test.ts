import { describe, expect, it } from 'vitest';
import { ListListingsQuerySchema } from './list-listings-query';

describe('ListListingsQuerySchema', () => {
  it('defaults sellerId to "me" and coerces page/pageSize from query-string values', () => {
    const result = ListListingsQuerySchema.safeParse({ page: '2', pageSize: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sellerId).toBe('me');
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts an optional status filter', () => {
    const result = ListListingsQuerySchema.safeParse({ status: 'LIVE' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('LIVE');
  });

  it('rejects an unknown status', () => {
    expect(ListListingsQuerySchema.safeParse({ status: 'EXPIRED' }).success).toBe(false);
  });
});
