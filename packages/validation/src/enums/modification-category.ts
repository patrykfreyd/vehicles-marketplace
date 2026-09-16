import { z } from 'zod';

export const ModificationCategorySchema = z.enum([
  'ECU_TUNE',
  'EXHAUST',
  'INTAKE',
  'FORCED_INDUCTION',
  'SUSPENSION',
  'BRAKES',
  'WHEELS',
  'BODYWORK',
  'INTERIOR',
  'AUDIO',
  'OTHER',
]);

export type ModificationCategory = z.infer<typeof ModificationCategorySchema>;
