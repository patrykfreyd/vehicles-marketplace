import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PageRequestSchema, PageResponseSchema } from './pagination';

describe('PageRequestSchema', () => {
  it('defaults page/pageSize when omitted', () => {
    const result = PageRequestSchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('rejects a pageSize over the max', () => {
    expect(PageRequestSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});

describe('PageResponseSchema', () => {
  const VehicleListItemSchema = z.object({ id: z.string() });
  const schema = PageResponseSchema(VehicleListItemSchema);

  it('accepts a valid page of items', () => {
    const result = schema.safeParse({
      items: [{ id: 'veh_1' }, { id: 'veh_2' }],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an item that fails the item schema', () => {
    const result = schema.safeParse({
      items: [{ id: 42 }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.success).toBe(false);
  });
});
