import { describe, expect, it } from 'vitest';
import { DvlaClientError, DvlaNotFoundError } from './dvla-client';
import {
  FakeDvlaClient,
  FIXTURE_FOUND_REGISTRATION,
  FIXTURE_NOT_FOUND_REGISTRATION,
  FIXTURE_SERVICE_ERROR_REGISTRATION,
  FIXTURE_UNMATCHED_MAKE_REGISTRATION,
  FIXTURE_UNMATCHED_MAKE_TEXT,
} from './dvla-client.fake';

describe('FakeDvlaClient', () => {
  const client = new FakeDvlaClient();

  it('returns realistic fixture data for the "found" registration', async () => {
    const result = await client.lookup(FIXTURE_FOUND_REGISTRATION);
    expect(result).toMatchObject({
      registrationNumber: FIXTURE_FOUND_REGISTRATION,
      make: 'BMW',
      yearOfManufacture: 2022,
      engineCapacityCc: 2993,
      fuelType: 'PETROL',
    });
    expect(result.raw).toBeDefined();
  });

  it('throws DvlaNotFoundError for the "not found" fixture registration', async () => {
    await expect(client.lookup(FIXTURE_NOT_FOUND_REGISTRATION)).rejects.toThrow(DvlaNotFoundError);
  });

  it('throws DvlaNotFoundError for any other unrecognized registration', async () => {
    await expect(client.lookup('ZZ99ZZZ')).rejects.toThrow(DvlaNotFoundError);
  });

  it('throws DvlaClientError for the simulated-outage fixture registration', async () => {
    await expect(client.lookup(FIXTURE_SERVICE_ERROR_REGISTRATION)).rejects.toThrow(
      DvlaClientError,
    );
  });

  it('returns a deliberately catalogue-unmatched make for the "unmatched make" fixture', async () => {
    const result = await client.lookup(FIXTURE_UNMATCHED_MAKE_REGISTRATION);
    expect(result.make).toBe(FIXTURE_UNMATCHED_MAKE_TEXT);
  });
});
