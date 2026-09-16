import { z } from 'zod';

/**
 * plans/08-catalogue-data-model-json-schema.md §4 — the canonical colour
 * family every manufacturer paint name (`ManufacturerColour`) maps onto.
 * Originally defined in `@vehicles-marketplace/catalogue-types` (Plan 08);
 * moved here per plans/11-vehicle-listing-data-model.md §5, which needs it
 * for `Vehicle.colourFamily` and can't depend on `catalogue-types` (that
 * package depends on `validation`, never the reverse) — `catalogue-types`
 * now re-exports this instead of defining its own copy.
 */
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
