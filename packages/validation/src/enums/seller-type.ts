import { z } from 'zod';

export const SellerTypeSchema = z.enum(['PRIVATE', 'DEALER']);

export type SellerType = z.infer<typeof SellerTypeSchema>;
