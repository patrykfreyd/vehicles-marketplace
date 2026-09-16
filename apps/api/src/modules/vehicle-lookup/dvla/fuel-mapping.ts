/**
 * Maps DVLA VES's free-text `fuelType` onto our controlled `Fuel` enum
 * (`packages/validation`'s `FuelTypeSchema`) — needed because §3's matching
 * requires an exact fuel match against Plan 08's catalogue, which only ever
 * uses this closed set. DVLA's real values include ones with no clean
 * `PHEV` vs `HYBRID` distinction (it doesn't separate them) and values this
 * codebase has no catalogue equivalent for at all (`GAS`, `GAS BI-FUEL`,
 * `STEAM`, `OTHER`) — those intentionally map to `null` rather than a wrong
 * guess; §3's own matching ranking already handles "no exact fuel match" by
 * returning no candidates and offering manual fallback, rather than this
 * function needing to be exhaustive.
 */
import type { FuelType } from '@vehicles-marketplace/validation';

const FUEL_MAP: Record<string, FuelType> = {
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  ELECTRIC: 'ELECTRIC',
  ELECTRICITY: 'ELECTRIC',
  HYDROGEN: 'HYDROGEN',
};

export function mapDvlaFuelType(rawFuelType: string | undefined): FuelType | null {
  if (!rawFuelType) return null;
  const normalized = rawFuelType.trim().toUpperCase();
  if (FUEL_MAP[normalized]) return FUEL_MAP[normalized];
  // DVLA's hybrid-ish values are all some variant of "HYBRID ELECTRIC
  // (PETROL/ELECTRIC)" — no reliable way to tell HEV from PHEV apart from
  // the string alone, so every one of them maps to the closer of our two
  // enum values, `HYBRID`.
  if (normalized.includes('HYBRID')) return 'HYBRID';
  return null;
}
