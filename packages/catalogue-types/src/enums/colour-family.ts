/**
 * plans/08-catalogue-data-model-json-schema.md §4 — the canonical colour
 * family every manufacturer paint name (ManufacturerColour) maps onto, so
 * "search blue cars" works across every manufacturer's own paint naming.
 */
import { z } from 'zod';

export const ColourFamilySchema = z.enum([
  'BLACK',
  'WHITE',
  'BLUE',
  'RED',
  'GREEN',
  'GREY',
  'SILVER',
  'YELLOW',
  'ORANGE',
  'PURPLE',
  'BROWN',
  'BEIGE',
]);

export type ColourFamily = z.infer<typeof ColourFamilySchema>;
