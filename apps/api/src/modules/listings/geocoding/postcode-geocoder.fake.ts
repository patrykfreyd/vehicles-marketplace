/**
 * The fixture-backed `PostcodeGeocoder` used by every test that needs a
 * deterministic, no-network result — same role as
 * `vehicle-lookup/dvla/dvla-client.fake.ts`'s `FakeDvlaClient`. Two real UK
 * postcodes, geocoded against real-world coordinates, so a `DISTANCE_ASC`
 * search test (plans/13-search-filtering.md §9) exercises genuine
 * nearest-first ordering rather than arbitrary numbers: Macclesfield (SK11)
 * and central London (SW1A) are roughly 165 miles apart.
 */
import type { GeocodedPostcode, PostcodeGeocoder } from './postcode-geocoder';
import { PostcodeGeocoderError, PostcodeNotFoundError } from './postcode-geocoder';

export const FIXTURE_POSTCODE_MACCLESFIELD = 'SK11 9DL';
export const FIXTURE_POSTCODE_LONDON = 'SW1A 1AA';
export const FIXTURE_POSTCODE_NOT_FOUND = 'ZZ99 9ZZ';
export const FIXTURE_POSTCODE_SERVICE_ERROR = 'ER0 0ER';

const FIXTURES: Record<string, GeocodedPostcode> = {
  [FIXTURE_POSTCODE_MACCLESFIELD]: { latitude: 53.2588, longitude: -2.1309, postcodeArea: 'SK' },
  [FIXTURE_POSTCODE_LONDON]: { latitude: 51.5014, longitude: -0.1419, postcodeArea: 'SW' },
};

export class FakePostcodeGeocoder implements PostcodeGeocoder {
  async geocode(postcode: string): Promise<GeocodedPostcode> {
    const normalized = postcode.trim().toUpperCase();
    if (normalized === FIXTURE_POSTCODE_SERVICE_ERROR) {
      throw new PostcodeGeocoderError('Simulated postcodes.io outage (fixture postcode)');
    }
    const fixture = FIXTURES[normalized];
    if (!fixture) {
      throw new PostcodeNotFoundError(`No fixture geocoding result for postcode ${postcode}`);
    }
    return fixture;
  }
}
