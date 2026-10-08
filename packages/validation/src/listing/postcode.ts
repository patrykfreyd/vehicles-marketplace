import { z } from 'zod';

/**
 * plans/13-search-filtering.md §3/§4 — a seller's full UK postcode,
 * captured at listing-creation time so `ListingsService` can geocode it
 * into `latitude`/`longitude` via postcodes.io. Loosely validated here
 * (postcodes.io itself is the source of truth on whether it's real) —
 * this just rejects obviously-malformed input before a wasted network call.
 */
export const UkPostcodeSchema = z
  .string()
  .trim()
  .min(5, 'Enter a full UK postcode')
  .max(8, 'Enter a full UK postcode')
  .regex(/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/, 'Enter a valid UK postcode');

/**
 * The "area" part of a UK postcode — its leading letters, before the first
 * digit (e.g. "SK" from "SK11 9DL", "EC" from "EC1A 1BB"). This is the only
 * part of a postcode ever stored as public (`Listing.locationPostcodeArea`,
 * decided in plans/11-vehicle-listing-data-model.md §3); the full postcode
 * itself stays private.
 */
export function extractPostcodeArea(postcode: string): string {
  const match = /^[A-Za-z]+/.exec(postcode.trim());
  return (match?.[0] ?? '').toUpperCase();
}
