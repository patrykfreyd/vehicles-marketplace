# Plan 13 — Search & Filtering (Standard + Advanced)

Status: Draft
Depends on: Plan 08 (catalogue fields/aliases being searched), Plan 09
(only `APPROVED` derivatives are searchable), Plan 11 (`Listing`/`Vehicle`
fields, visibility rule — only `LIVE`/`RESERVED` returned), Plan 03
(enums), Plan 06 (Postgres/Prisma)
Blocks: Plan 14 (AI Search converts natural language into this plan's
filter shape), Plan 15 (Vehicle Detail's "Similar Cars"), Plan 17 (Saved
Searches persist and re-run this plan's request shape), Plan 19 (Research
pages reuse the catalogue-tree browsing this plan queries against), Plan
27 (Analytics attaches impression/click events to the `searchId` this
plan mints)

## 1. Objective

Implement the marketplace's core search: standard filters (make, price,
mileage, year, fuel, etc.) and the enthusiast/advanced tier (generation,
derivative, engine family, power, drivetrain, manufacturer colour,
equipment) from `idea/vehicle_database_catalogue_approach.md` §14 and
`idea/vehicle_marketplace_web_mobile_functions.md` §4–5, combined with
free-text matching against catalogue names and aliases via `pg_trgm`.

"Done" means: a single search endpoint correctly filters and sorts
listings against every field in §5/§6 below, a free-text query like "M4
Comp xDrive" matches through `CatalogueAlias` fuzzy matching, distance
sorting works against a real UK postcode, and only publicly-visible
listings are ever returned.

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md` and the catalogue doc

- **PostgreSQL only** for search in V1 — `pg_trgm`, GIN indexes, full-text
  search. No Meilisearch/OpenSearch/Elasticsearch at this stage (stack doc
  §17/§34) — a dedicated search engine is explicitly future work (Plan 02
  §36 Stage 6), triggered only if Postgres search actually becomes
  limiting.
- Two filter *tiers* — standard vs advanced/enthusiast (catalogue doc
  §14) — but this is a **front-end presentation split, not two backend
  endpoints**: one comprehensive search API, one Zod schema; which fields
  a given screen exposes in "Filters" vs "Advanced Filters" is purely a
  UI decision made per-screen by Plan 15/19/20's consumers.
- Controlled enums, not free text, for every filterable structured field
  (fuel, transmission, drivetrain, body style, colour family) — already
  established in Plan 03/08.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Query implementation | **Straightforward indexed relational joins** via Prisma (Vehicle → Derivative → Generation → Model → Make), dropping into `$queryRaw`/`Prisma.sql` only for the distance/trigram-ranking parts of the query | At V1's expected listing volume (hundreds to low thousands), a well-indexed join is fast and simple. A denormalized/materialized search read-model is a real, well-known optimization — but building it now would be exactly the kind of premature infrastructure the stack doc repeatedly warns against. Documented here as a **future optimization**, not built until real query performance data justifies it |
| Location/distance | Add `latitude`/`longitude` (public, city/area precision) to `Listing`, geocoded from the seller's full postcode at listing-creation time via **postcodes.io** (free, no API key, UK-specific) — the full postcode itself stays private, only the masked area (already decided in Plan 11 §3) and the derived approximate coordinates are ever public | Plan 11 only stored a postcode *area* string (e.g. "SK"), which can't support the "18 miles away" distance sorting shown directly in the mockups and required by the functions doc. This plan adds the missing geocoding step — a justified extension of Plan 11's `Listing` model, since distance search is this plan's core responsibility |
| Equipment filter semantics | **AND** (`hasEvery`) — selecting "Adaptive Cruise" + "Heated Seats" returns only cars with *both* | Matches normal marketplace filter UX: each added filter narrows the result set further, not broadens it |
| Free-text + structured combination | One query: structured filters apply as `WHERE` clauses; free text matches via `pg_trgm` similarity against `CatalogueAlias.alias` (Plan 08) and `Derivative.name`/`Generation.code`, both applied together, not as two separate search modes | Matches the catalogue doc's own worked example — an enthusiast combining "S58" + "Marina Bay Blue" + a price filter in one search |
| `searchId` | This plan **mints** a fresh ID per search request and returns it in the response; it does **not** persist a search log table itself | Plan 27 (Analytics) owns recording `SEARCH_PERFORMED`/`SEARCH_ZERO_RESULTS`/impression events keyed by this ID — this plan's only obligation is to hand back a stable ID callers can attach to those later events, avoiding two overlapping "search log" tables |

## 4. Schema additions

Enable the extension (this plan is where it's actually turned on, per
Plan 08/09's explicit deferral):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_catalogue_alias_trgm ON catalogue_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX idx_derivative_name_trgm ON derivatives USING GIN (name gin_trgm_ops);
```

Extends Plan 11's `Listing` (justified per §3):

```prisma
model Listing {
  // ...existing fields
  latitude  Float?
  longitude Float?
}
```

Standard indexes added on every structured filter column used below
(`Listing.pricePence`, `Vehicle.mileageMiles`, `Derivative.powerBhp`,
etc.) — listed in full in the implementation PR, not repeated here.

## 5. `SearchRequestSchema` (`packages/validation/src/search`)

```ts
export const SearchRequestSchema = z.object({
  query: z.string().optional(),               // free text

  makeIds: z.array(z.string()).optional(),
  modelIds: z.array(z.string()).optional(),
  generationIds: z.array(z.string()).optional(),
  derivativeIds: z.array(z.string()).optional(),

  minPricePence: z.number().int().optional(),
  maxPricePence: z.number().int().optional(),
  minYear: z.number().int().optional(),
  maxYear: z.number().int().optional(),
  minMileage: z.number().int().optional(),
  maxMileage: z.number().int().optional(),

  fuel: z.array(FuelSchema).optional(),
  transmission: z.array(TransmissionSchema).optional(),
  drivetrain: z.array(DrivetrainSchema).optional(),
  bodyStyle: z.array(BodyStyleSchema).optional(),
  colourFamily: z.array(ColourFamilySchema).optional(),

  minPowerBhp: z.number().int().optional(),
  minTorqueNm: z.number().int().optional(),
  maxZeroToSixtyTwo: z.number().optional(),
  engineFamily: z.array(z.string()).optional(),

  equipmentIds: z.array(z.string()).optional(),  // AND semantics, §3

  originLatitude: z.number().optional(),
  originLongitude: z.number().optional(),
  maxDistanceMiles: z.number().optional(),
  boundingBox: z.object({ /* for future Map Results, cheap to include now */
    north: z.number(), south: z.number(), east: z.number(), west: z.number(),
  }).optional(),

  sort: z.enum([
    "RELEVANCE", "PRICE_ASC", "PRICE_DESC",
    "MILEAGE_ASC", "YEAR_DESC", "DISTANCE_ASC",
  ]).default("RELEVANCE"),

  page: PageRequestSchema,
});
```

`minPricePence > maxPricePence` (and equivalent range fields) is validated
at the schema level with a Zod `.refine()`, so an inverted range shows an
inline error (Plan 04 §6) on the filter panel rather than silently
returning zero results.

## 6. Search service query shape

```text
SELECT listings.*, vehicles.*, derivatives.*, ...
FROM listings
JOIN vehicles ON vehicles.id = listings.vehicle_id
JOIN derivatives ON derivatives.id = vehicles.derivative_id
JOIN generations ON generations.id = derivatives.generation_id
JOIN models ON models.id = generations.model_id
JOIN makes ON makes.id = models.make_id
LEFT JOIN vehicle_equipment ve ON ve.vehicle_id = vehicles.id
WHERE listings.status IN ('LIVE', 'RESERVED')     -- Plan 11 §3 visibility rule, always applied
  AND derivatives.status = 'APPROVED'              -- Plan 09 §6 rule, always applied
  AND [structured filters from §5]
  AND [free-text: similarity(alias/name, :query) > threshold, if query present]
GROUP BY listings.id
HAVING [equipment AND-match count = equipmentIds.length, if equipmentIds present]
ORDER BY [relevance score | price | mileage | year | distance via Haversine]
LIMIT/OFFSET via cursor pagination (Plan 03's PageResponseSchema)
```

Distance is computed with a plain Haversine expression in raw SQL (no
PostGIS — unnecessary weight for straight-line "X miles away" sorting at
this scale).

## 7. API (`apps/api/src/modules/search`)

```text
POST /api/v1/search
  body: SearchRequestSchema
  → { searchId, items: SearchResultSchema[], nextCursor, total }
```

`POST`, not `GET`, because the full filter payload (especially equipment
arrays and bounding boxes) is unwieldy as query params and this endpoint
is never meant to be a bookmarkable URL on its own — the web app's own
route/query-string encoding for shareable search URLs is a Plan 15/19
front-end concern layered on top of this API.

`SearchResultSchema` is a flattened, list-view-optimized shape (not the
full `Listing`/`Vehicle`/`Derivative` objects) — enough for a result card
(price, thumbnail, headline spec, distance) without over-fetching detail
fields only needed on the full Vehicle Detail page (Plan 15).

## 8. Out of scope for this plan

- Natural-language → structured-filter conversion → **Plan 14**
- Saved searches (persisting a `SearchRequestSchema` payload for re-run/
  alerting) → **Plan 17**
- The Research section's catalogue-tree browsing pages → **Plan 19**
  (reuses this module's underlying catalogue queries, doesn't duplicate
  them)
- Recording `SEARCH_PERFORMED`/impression/click analytics events →
  **Plan 27** (this plan only provides `searchId` for those events to
  reference)
- A dedicated search engine (Meilisearch/OpenSearch) → deferred per §3,
  Plan 02 §36 Stage 6
- Full Map Results UI → **Plan 15/19** (this plan only adds the bounding-
  box filter support cheaply alongside the lat/lng work it's already
  doing)

## 9. Acceptance criteria

- [ ] `pg_trgm` is enabled and the GIN indexes in §4 exist.
- [ ] A free-text search for "M4 Comp xDrive" returns the BMW M4
      Competition xDrive fixture via alias matching, even though that
      exact string isn't the derivative's canonical name.
- [ ] Standard filters (make, price range, mileage range) and advanced
      filters (engine family, drivetrain, power, equipment) each work
      correctly, individually and combined.
- [ ] Selecting two equipment items returns only listings whose vehicle
      has *both*, not either (§3's AND semantics).
- [ ] `DISTANCE_ASC` sorting against a real geocoded postcode returns
      results in correct nearest-first order.
- [ ] A search with `minPricePence > maxPricePence` returns a field-level
      validation error, not an empty result set.
- [ ] A `DRAFT` or `SOLD` listing never appears in any search result,
      regardless of how permissive the filters are.
- [ ] The response includes a fresh `searchId` on every call and a
      `PageResponseSchema`-shaped page of results.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm **postcodes.io** for geocoding — free and UK-specific, but
   flag now if you'd rather use a paid/more precise geocoder later.
2. Confirm AND semantics for multi-equipment filtering (§3) — some users
   might expect OR ("any of these features"); AND matches typical
   marketplace UX but worth confirming for this product specifically.
3. Confirm deferring a denormalized search index (§3) in favor of plain
   indexed joins for V1 — agree with holding off until real performance
   data justifies it, or would you rather build the read-model now?
