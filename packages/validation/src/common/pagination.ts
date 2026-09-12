/**
 * Shared page-request/page-response shapes for every list endpoint, so
 * Plan 05's API and Plan 04's form/list layer don't each invent their own.
 *
 * `PageResponseSchema` is a factory rather than a fixed schema because the
 * item type differs per endpoint — call it with the item schema for that
 * endpoint (`PageResponseSchema(VehicleSchema)`, etc.). Its generic result
 * type, `PageResponse<T>`, is kept hand-in-hand with the factory below
 * (rather than derived via `z.infer`, which can't cleanly type a generic
 * factory's return across packages).
 */
import { z } from 'zod';

export const PageRequestSchema = z.object({
  page: z.number().int('page must be a whole number').min(1, 'page must be at least 1').default(1),
  pageSize: z
    .number()
    .int('pageSize must be a whole number')
    .min(1, 'pageSize must be at least 1')
    .max(100, 'pageSize cannot exceed 100')
    .default(20),
});

export type PageRequest = z.infer<typeof PageRequestSchema>;

export function PageResponseSchema<ItemSchema extends z.ZodTypeAny>(itemSchema: ItemSchema) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Compile-time check that PageResponseSchema's inferred shape stays in sync
// with the hand-written PageResponse<T> above, for a representative item
// type (string).
type _AssertPageResponseMatches =
  z.infer<ReturnType<typeof PageResponseSchema<z.ZodString>>> extends PageResponse<string>
    ? true
    : never;
const _assertPageResponseMatches: _AssertPageResponseMatches = true;
void _assertPageResponseMatches;
