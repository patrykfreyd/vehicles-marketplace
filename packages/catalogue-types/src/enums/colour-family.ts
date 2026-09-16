/**
 * Re-exported from `@vehicles-marketplace/validation` — see that package's
 * `enums/colour-family.ts` for why the canonical definition moved there
 * (plans/11-vehicle-listing-data-model.md §5). Kept as a local module so
 * every existing relative import (`./enums/colour-family`) inside this
 * package keeps working unchanged.
 */
export { ColourFamilySchema, type ColourFamily } from '@vehicles-marketplace/validation';
