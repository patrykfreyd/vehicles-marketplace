import { z } from 'zod';

export const EquipmentSourceSchema = z.enum(['SELLER_DECLARED', 'AI_DETECTED']);

export type EquipmentSource = z.infer<typeof EquipmentSourceSchema>;
