/**
 * plans/13-search-filtering.md §3 — a provider-agnostic geocoder interface,
 * same shape as `vehicle-lookup/dvla/dvla-client.ts`: a real HTTP
 * implementation (`postcode-geocoder.http.ts`) and a fixture-backed fake
 * (`postcode-geocoder.fake.ts`). Used only by `ListingsService.create`, to
 * turn a seller's full postcode into the public, city/area-precision
 * `latitude`/`longitude` stored on `Listing` (the full postcode itself
 * stays private — never returned by any API response).
 */

export interface GeocodedPostcode {
  latitude: number;
  longitude: number;
  /** The postcode's "area" — its leading letters (e.g. "SK" for "SK11 9DL"). */
  postcodeArea: string;
}

/** Thrown when the geocoder has no record for the given postcode — a normal, expected outcome (an invalid/unassigned postcode), not a service failure. */
export class PostcodeNotFoundError extends Error {}

/** Thrown for anything else going wrong talking to the geocoder — network failure, a non-2xx/404 response, malformed body. */
export class PostcodeGeocoderError extends Error {}

export interface PostcodeGeocoder {
  geocode(postcode: string): Promise<GeocodedPostcode>;
}
