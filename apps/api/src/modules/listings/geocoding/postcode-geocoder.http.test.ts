import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostcodeGeocoderError, PostcodeNotFoundError } from './postcode-geocoder';
import { HttpPostcodeGeocoder } from './postcode-geocoder.http';

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('HttpPostcodeGeocoder', () => {
  const client = new HttpPostcodeGeocoder({ baseUrl: 'https://postcodes.example' });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a successful postcodes.io response into a GeocodedPostcode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          status: 200,
          result: { latitude: 53.2588, longitude: -2.1309, outcode: 'SK11' },
        }),
      ),
    );

    const result = await client.geocode('SK11 9DL');
    expect(result).toEqual({ latitude: 53.2588, longitude: -2.1309, postcodeArea: 'SK' });
  });

  it('throws PostcodeNotFoundError on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(404, {})));
    await expect(client.geocode('ZZ99 9ZZ')).rejects.toThrow(PostcodeNotFoundError);
  });

  it('throws PostcodeGeocoderError on a non-2xx, non-404 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, {})));
    await expect(client.geocode('SK11 9DL')).rejects.toThrow(PostcodeGeocoderError);
  });

  it('throws PostcodeGeocoderError when fetch itself rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(client.geocode('SK11 9DL')).rejects.toThrow(PostcodeGeocoderError);
  });

  it('throws PostcodeGeocoderError when required fields are missing from an otherwise-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(200, { status: 200, result: {} })),
    );
    await expect(client.geocode('SK11 9DL')).rejects.toThrow(PostcodeGeocoderError);
  });
});
