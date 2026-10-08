/**
 * The real `PostcodeGeocoder` — postcodes.io's free, keyless, UK-specific
 * lookup API (§2's "Decisions this plan needs to fix", confirmed:
 * postcodes.io for V1; see plans/13-search-filtering.md §10.1).
 * `GET {baseUrl}/postcodes/{postcode}`. No API key, so (unlike
 * `DvlaHttpClient`) this is always the client `ListingsModule` wires up in
 * every environment — there's no real-vs-fake config switch to make.
 */
import type { GeocodedPostcode, PostcodeGeocoder } from './postcode-geocoder';
import { PostcodeGeocoderError, PostcodeNotFoundError } from './postcode-geocoder';

export interface PostcodeGeocoderHttpOptions {
  baseUrl: string;
}

interface PostcodesIoResponseBody {
  status?: number;
  result?: {
    latitude?: number;
    longitude?: number;
    outcode?: string;
  };
}

export class HttpPostcodeGeocoder implements PostcodeGeocoder {
  constructor(private readonly options: PostcodeGeocoderHttpOptions) {}

  async geocode(postcode: string): Promise<GeocodedPostcode> {
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/postcodes/${encodeURIComponent(postcode)}`);
    } catch (error) {
      throw new PostcodeGeocoderError(
        `Could not reach postcodes.io: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (response.status === 404) {
      throw new PostcodeNotFoundError(`No geocoding result for postcode ${postcode}`);
    }
    if (!response.ok) {
      throw new PostcodeGeocoderError(`Postcode geocoding failed with status ${response.status}`);
    }

    let body: PostcodesIoResponseBody;
    try {
      body = (await response.json()) as PostcodesIoResponseBody;
    } catch {
      throw new PostcodeGeocoderError('postcodes.io returned a response that was not valid JSON');
    }

    const { latitude, longitude, outcode } = body.result ?? {};
    if (latitude === undefined || longitude === undefined || !outcode) {
      throw new PostcodeGeocoderError('postcodes.io response was missing required fields');
    }

    const areaMatch = /^[A-Za-z]+/.exec(outcode);
    return { latitude, longitude, postcodeArea: (areaMatch?.[0] ?? outcode).toUpperCase() };
  }
}
