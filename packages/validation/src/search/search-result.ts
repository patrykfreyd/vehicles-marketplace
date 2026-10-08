import { z } from 'zod';
import { MoneyPenceSchema } from '../common/money';
import { PageResponseSchema } from '../common/pagination';
import { BodyStyleSchema } from '../enums/body-style';
import { ColourFamilySchema } from '../enums/colour-family';
import { DrivetrainSchema } from '../enums/drivetrain';
import { FuelTypeSchema } from '../enums/fuel';
import { ListingStatusSchema } from '../enums/listing-status';
import { TransmissionSchema } from '../enums/transmission';

/**
 * plans/13-search-filtering.md §7 — a flattened, list-view-optimized
 * result shape (enough for a result card: price, thumbnail, headline spec,
 * distance), not the full `Listing`/`Vehicle`/`Derivative` objects a
 * Vehicle Detail page (Plan 15) needs.
 *
 * `.min(1).nullable()` (not bare `.nullable()`) on every nullable string
 * field — see `media/media.ts`'s comment on why bare
 * `z.string().nullable()` breaks nestjs-zod's OpenAPI conversion.
 */
export const SearchResultSchema = z.object({
  listingId: z.string().min(1),
  vehicleId: z.string().min(1),

  pricePence: MoneyPenceSchema,
  title: z.string().min(1).nullable(),
  thumbnailUrl: z.string().min(1).nullable(),
  status: ListingStatusSchema,
  publishedAt: z.string().min(1).nullable(),

  makeId: z.string().min(1),
  makeName: z.string().min(1),
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  generationId: z.string().min(1),
  generationCode: z.string().min(1),
  derivativeId: z.string().min(1),
  derivativeName: z.string().min(1),

  bodyStyle: BodyStyleSchema,
  fuel: FuelTypeSchema,
  transmissions: z.array(TransmissionSchema),
  drivetrain: DrivetrainSchema,
  powerBhp: z.number().int().nullable(),

  mileageMiles: z.number().int().nonnegative(),
  firstRegisteredAt: z.string().min(1).nullable(),
  colourFamily: ColourFamilySchema.nullable(),

  locationPostcodeArea: z.string().min(1).nullable(),
  /** Miles, only present when the request carried an `origin*`. */
  distanceMiles: z.number().nullable(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = PageResponseSchema(SearchResultSchema).extend({
  /**
   * §3 — minted fresh per request, never persisted by this plan; Plan 27
   * (Analytics) records `SEARCH_PERFORMED`/impression/click events keyed
   * by this ID.
   */
  searchId: z.string().min(1),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
