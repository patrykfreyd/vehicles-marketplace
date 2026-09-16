import { z } from 'zod';

export const WriteOffCategorySchema = z.enum(['CAT_A', 'CAT_B', 'CAT_S', 'CAT_N']);

export type WriteOffCategory = z.infer<typeof WriteOffCategorySchema>;
