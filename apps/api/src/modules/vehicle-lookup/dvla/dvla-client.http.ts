/**
 * The real `DvlaClient` — DVLA's Vehicle Enquiry Service (VES) API
 * (§2: `POST {baseUrl}` with `{ registrationNumber }`, `x-api-key` header).
 * Only ever constructed by `vehicle-lookup.module.ts` once `DVLA_API_KEY`
 * is non-blank (§8) — nothing in Local/Test exercises this against the
 * real DVLA host; `dvla-client.http.test.ts` mocks `fetch`.
 */
import type { DvlaClient, DvlaVehicleData } from './dvla-client';
import { DvlaClientError, DvlaNotFoundError } from './dvla-client';

export interface DvlaHttpClientOptions {
  apiKey: string;
  baseUrl: string;
}

/** The subset of VES's actual JSON response this client reads — see plans/10-dvla-lookup-seller-matching.md §2 for the full real field list. */
interface DvlaVesResponseBody {
  registrationNumber?: string;
  make?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  fuelType?: string;
  colour?: string;
  taxStatus?: string;
  motStatus?: string;
  motExpiryDate?: string;
}

export class DvlaHttpClient implements DvlaClient {
  constructor(private readonly options: DvlaHttpClientOptions) {}

  async lookup(registration: string): Promise<DvlaVehicleData> {
    let response: Response;
    try {
      response = await fetch(this.options.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.options.apiKey,
        },
        body: JSON.stringify({ registrationNumber: registration }),
      });
    } catch (error) {
      throw new DvlaClientError(
        `Could not reach DVLA: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (response.status === 404) {
      throw new DvlaNotFoundError(`No DVLA record for registration ${registration}`);
    }
    if (!response.ok) {
      throw new DvlaClientError(`DVLA lookup failed with status ${response.status}`);
    }

    let body: DvlaVesResponseBody;
    try {
      body = (await response.json()) as DvlaVesResponseBody;
    } catch {
      throw new DvlaClientError('DVLA returned a response that was not valid JSON');
    }

    if (!body.make || body.yearOfManufacture === undefined) {
      throw new DvlaClientError('DVLA response was missing required fields');
    }

    return {
      registrationNumber: body.registrationNumber ?? registration,
      make: body.make,
      yearOfManufacture: body.yearOfManufacture,
      engineCapacityCc: body.engineCapacity,
      fuelType: body.fuelType ?? '',
      colour: body.colour,
      taxStatus: body.taxStatus,
      motStatus: body.motStatus,
      motExpiryDate: body.motExpiryDate,
      raw: body,
    };
  }
}
