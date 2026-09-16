/**
 * plans/10-dvla-lookup-seller-matching.md §3 — "DVLA client abstraction": a
 * provider-agnostic interface with a real HTTP implementation
 * (`dvla-client.http.ts`) and a fake, fixture-backed one
 * (`dvla-client.fake.ts`), the same shape as `apps/catalogue-cli`'s
 * `AiClient` (Plan 09 §3). §2 corrects what DVLA actually returns — no
 * model/trim, just make/year/engine/fuel/colour/tax/MOT.
 */

export interface DvlaVehicleData {
  registrationNumber: string;
  make: string;
  yearOfManufacture: number;
  /** DVLA omits this for some vehicle types — never guess a value here. */
  engineCapacityCc?: number;
  /** DVLA's raw fuelType string (e.g. "PETROL", "HYBRID ELECTRIC") — mapped onto our controlled `Fuel` enum by the caller, not this client. */
  fuelType: string;
  colour?: string;
  taxStatus?: string;
  motStatus?: string;
  /** ISO date string. */
  motExpiryDate?: string;
  /** The full, unmodified DVLA payload — stored as `VehicleLookup.dvlaRawResponse` for audit. */
  raw: unknown;
}

/** Thrown when DVLA has no record for the given registration — a normal, expected outcome (§6's "we couldn't find a vehicle" case), not a service failure. */
export class DvlaNotFoundError extends Error {}

/** Thrown for anything else going wrong talking to DVLA — network failure, a non-2xx/404 response, malformed body. §6 renders this as a toast, never a field error. */
export class DvlaClientError extends Error {}

export interface DvlaClient {
  lookup(registration: string): Promise<DvlaVehicleData>;
}
