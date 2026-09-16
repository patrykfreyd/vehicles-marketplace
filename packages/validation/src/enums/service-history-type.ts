import { z } from 'zod';

export const ServiceHistoryTypeSchema = z.enum(['FULL', 'PARTIAL', 'NONE', 'UNKNOWN']);

export type ServiceHistoryType = z.infer<typeof ServiceHistoryTypeSchema>;
