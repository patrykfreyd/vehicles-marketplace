/**
 * plans/10-dvla-lookup-seller-matching.md §3/§8 — the fixture-backed
 * `DvlaClient` used in Local/Test (selected by `vehicle-lookup.module.ts`
 * whenever `DVLA_API_KEY` is blank), so this whole flow works without a
 * real DVLA account or a real UK registration.
 *
 * `FIXTURE_FOUND_BMW_M4` deliberately matches Plan 08/09's own BMW M4
 * fixture (`catalogue/bmw/m4.json`)'s G82 "M4 Competition xDrive" —
 * PETROL, 2993cc, year 2021+ — so this plan's acceptance criteria (§8) and
 * `apps/api`'s own fixtures can be exercised end to end without inventing a
 * second, unrelated BMW.
 */
import type { DvlaClient, DvlaVehicleData } from './dvla-client';
import { DvlaClientError, DvlaNotFoundError } from './dvla-client';

export const FIXTURE_FOUND_REGISTRATION = 'YA22GZX';
export const FIXTURE_NOT_FOUND_REGISTRATION = 'NF00TFD';
/** Simulates a transient DVLA outage — §6's "toast, not a field error" case. */
export const FIXTURE_SERVICE_ERROR_REGISTRATION = 'ER00ROR';
/** A "found" result for a make deliberately absent from any real catalogue data — exercises the "no catalogue Make matched" branch of `resolveMakeId` without depending on (or risking colliding with) whatever's actually imported into a given Make table. */
export const FIXTURE_UNMATCHED_MAKE_REGISTRATION = 'UM00TCH';
export const FIXTURE_UNMATCHED_MAKE_TEXT = 'Vehicles Marketplace Test Motors';

const FIXTURES: Record<string, Omit<DvlaVehicleData, 'raw'>> = {
  [FIXTURE_FOUND_REGISTRATION]: {
    registrationNumber: FIXTURE_FOUND_REGISTRATION,
    make: 'BMW',
    yearOfManufacture: 2022,
    engineCapacityCc: 2993,
    fuelType: 'PETROL',
    colour: 'BLUE',
    taxStatus: 'Taxed',
    motStatus: 'Valid',
    motExpiryDate: '2027-03-01',
  },
  [FIXTURE_UNMATCHED_MAKE_REGISTRATION]: {
    registrationNumber: FIXTURE_UNMATCHED_MAKE_REGISTRATION,
    make: FIXTURE_UNMATCHED_MAKE_TEXT,
    yearOfManufacture: 2020,
    engineCapacityCc: 1998,
    fuelType: 'PETROL',
    colour: 'RED',
    taxStatus: 'Taxed',
    motStatus: 'Valid',
    motExpiryDate: '2026-06-01',
  },
};

export class FakeDvlaClient implements DvlaClient {
  /** Expects an already-normalized registration (§5: the service normalizes before calling any `DvlaClient`). */
  async lookup(registration: string): Promise<DvlaVehicleData> {
    if (registration === FIXTURE_SERVICE_ERROR_REGISTRATION) {
      throw new DvlaClientError('Simulated DVLA outage (fixture registration)');
    }

    const fixture = FIXTURES[registration];
    if (!fixture) {
      throw new DvlaNotFoundError(`No fixture DVLA record for registration ${registration}`);
    }
    return { ...fixture, raw: fixture };
  }
}
