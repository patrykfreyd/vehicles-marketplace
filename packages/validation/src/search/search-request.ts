import { z } from 'zod';
import { BodyStyleSchema } from '../enums/body-style';
import { ColourFamilySchema } from '../enums/colour-family';
import { DrivetrainSchema } from '../enums/drivetrain';
import { FuelTypeSchema } from '../enums/fuel';
import { TransmissionSchema } from '../enums/transmission';

/**
 * plans/13-search-filtering.md §5 — one comprehensive search request, for
 * one search API (§2: standard vs advanced/enthusiast is a front-end
 * presentation split made per-screen by Plan 15/19/20, not two schemas).
 *
 * Two deliberate departures from the plan's own draft schema, to match
 * every other list endpoint in this codebase (see
 * packages/validation/src/common/pagination.ts):
 *  - `page`/`pageSize` are flat fields here, not a nested `page:
 *    PageRequestSchema` object — every other paginated request
 *    (`ListListingsQuerySchema`, etc.) takes them flat, and this is a JSON
 *    body (not a query string) so real numbers work directly without
 *    `z.coerce`.
 *  - The response (`search-result.ts`) reuses `PageResponseSchema`
 *    (page/pageSize/total/totalPages), not a `nextCursor` — no cursor
 *    pagination exists anywhere else in this codebase, and introducing it
 *    for just this one endpoint would be new infrastructure the plan
 *    doesn't otherwise justify.
 */
export const SearchSortSchema = z.enum([
  'RELEVANCE',
  'PRICE_ASC',
  'PRICE_DESC',
  'MILEAGE_ASC',
  'YEAR_DESC',
  'DISTANCE_ASC',
]);

export type SearchSort = z.infer<typeof SearchSortSchema>;

export const SearchBoundingBoxSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

export const SearchRequestSchema = z
  .object({
    query: z.string().min(1).optional(),

    makeIds: z.array(z.string().min(1)).optional(),
    modelIds: z.array(z.string().min(1)).optional(),
    generationIds: z.array(z.string().min(1)).optional(),
    derivativeIds: z.array(z.string().min(1)).optional(),

    minPricePence: z.number().int().nonnegative().optional(),
    maxPricePence: z.number().int().nonnegative().optional(),
    minYear: z.number().int().optional(),
    maxYear: z.number().int().optional(),
    minMileage: z.number().int().nonnegative().optional(),
    maxMileage: z.number().int().nonnegative().optional(),

    fuel: z.array(FuelTypeSchema).optional(),
    transmission: z.array(TransmissionSchema).optional(),
    drivetrain: z.array(DrivetrainSchema).optional(),
    bodyStyle: z.array(BodyStyleSchema).optional(),
    colourFamily: z.array(ColourFamilySchema).optional(),

    minPowerBhp: z.number().int().nonnegative().optional(),
    minTorqueNm: z.number().int().nonnegative().optional(),
    maxZeroToSixtyTwo: z.number().nonnegative().optional(),
    engineFamily: z.array(z.string().min(1)).optional(),

    // §3's AND semantics — a listing matches only if its vehicle has every
    // selected item, not any one of them.
    equipmentIds: z.array(z.string().min(1)).optional(),

    originLatitude: z.number().min(-90).max(90).optional(),
    originLongitude: z.number().min(-180).max(180).optional(),
    maxDistanceMiles: z.number().positive().optional(),
    boundingBox: SearchBoundingBoxSchema.optional(),

    sort: SearchSortSchema.default('RELEVANCE'),

    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) =>
      data.minPricePence === undefined ||
      data.maxPricePence === undefined ||
      data.minPricePence <= data.maxPricePence,
    {
      message: 'minPricePence cannot be greater than maxPricePence',
      path: ['minPricePence'],
    },
  )
  .refine(
    (data) =>
      data.minYear === undefined || data.maxYear === undefined || data.minYear <= data.maxYear,
    {
      message: 'minYear cannot be greater than maxYear',
      path: ['minYear'],
    },
  )
  .refine(
    (data) =>
      data.minMileage === undefined ||
      data.maxMileage === undefined ||
      data.minMileage <= data.maxMileage,
    {
      message: 'minMileage cannot be greater than maxMileage',
      path: ['minMileage'],
    },
  )
  .refine(
    (data) =>
      data.sort !== 'DISTANCE_ASC' ||
      (data.originLatitude !== undefined && data.originLongitude !== undefined),
    {
      message: 'originLatitude/originLongitude are required when sorting by DISTANCE_ASC',
      path: ['sort'],
    },
  )
  .refine(
    (data) =>
      data.maxDistanceMiles === undefined ||
      (data.originLatitude !== undefined && data.originLongitude !== undefined),
    {
      message: 'originLatitude/originLongitude are required when maxDistanceMiles is set',
      path: ['maxDistanceMiles'],
    },
  );

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
