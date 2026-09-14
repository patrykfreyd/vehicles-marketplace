/**
 * plans/08-catalogue-data-model-json-schema.md §4 — cylinder layout,
 * controlled so it filters/searches reliably instead of drifting into
 * free-text variants ("Straight-6", "I6", "inline six", ...).
 */
import { z } from 'zod';

export const EngineConfigurationSchema = z.enum([
  'INLINE_3',
  'INLINE_4',
  'INLINE_5',
  'INLINE_6',
  'V6',
  'V8',
  'V10',
  'V12',
  'FLAT_4',
  'FLAT_6',
  'ELECTRIC_MOTOR',
]);

export type EngineConfiguration = z.infer<typeof EngineConfigurationSchema>;
