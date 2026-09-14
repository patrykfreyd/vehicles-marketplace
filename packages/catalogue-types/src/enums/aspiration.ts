/** plans/08-catalogue-data-model-json-schema.md §4. */
import { z } from 'zod';

export const AspirationSchema = z.enum([
  'NATURALLY_ASPIRATED',
  'TURBO',
  'TWIN_TURBO',
  'SUPERCHARGED',
  'ELECTRIC',
]);

export type Aspiration = z.infer<typeof AspirationSchema>;
