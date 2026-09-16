import { afterEach, describe, expect, it, vi } from 'vitest';
import { DvlaClientError, DvlaNotFoundError } from './dvla-client';
import { DvlaHttpClient } from './dvla-client.http';

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('DvlaHttpClient', () => {
  const client = new DvlaHttpClient({
    apiKey: 'test-key',
    baseUrl: 'https://dvla.example/vehicles',
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a successful DVLA response into DvlaVehicleData', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          registrationNumber: 'YA22GZX',
          make: 'BMW',
          yearOfManufacture: 2022,
          engineCapacity: 2993,
          fuelType: 'PETROL',
          colour: 'BLUE',
          taxStatus: 'Taxed',
          motStatus: 'Valid',
          motExpiryDate: '2027-03-01',
        }),
      ),
    );

    const result = await client.lookup('YA22GZX');
    expect(result).toMatchObject({
      make: 'BMW',
      yearOfManufacture: 2022,
      engineCapacityCc: 2993,
      fuelType: 'PETROL',
    });
  });

  it('throws DvlaNotFoundError on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(404, {})));
    await expect(client.lookup('NF00TFD')).rejects.toThrow(DvlaNotFoundError);
  });

  it('throws DvlaClientError on a non-2xx, non-404 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, {})));
    await expect(client.lookup('YA22GZX')).rejects.toThrow(DvlaClientError);
  });

  it('throws DvlaClientError when fetch itself rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(client.lookup('YA22GZX')).rejects.toThrow(DvlaClientError);
  });

  it('throws DvlaClientError when required fields are missing from an otherwise-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { make: 'BMW' })));
    await expect(client.lookup('YA22GZX')).rejects.toThrow(DvlaClientError);
  });
});
