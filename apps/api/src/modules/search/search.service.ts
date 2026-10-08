/**
 * plans/13-search-filtering.md §5/§6/§9 — the real marketplace search:
 * standard + advanced/enthusiast filters (one schema, §2 — tiering is a
 * front-end concern), free-text `pg_trgm` matching against catalogue
 * aliases/names, equipment AND-matching, Haversine distance sort, and the
 * two hard-coded visibility rules (`Listing.status IN (LIVE, RESERVED)`
 * from Plan 11 §3, `Derivative.status = APPROVED` from Plan 09 §6) that
 * apply no matter how permissive the caller's filters are.
 *
 * Dropping into `$queryRaw`/`Prisma.sql` here (§3's "straightforward
 * indexed relational joins ... dropping into raw SQL only for the
 * distance/trigram-ranking parts") in practice means the whole query is
 * raw SQL: the structured `WHERE` filters, free-text ranking, and distance
 * all interact in one `ORDER BY`/pagination pass, and Prisma's query
 * builder has no vocabulary for trigram similarity or Haversine distance
 * at all — splitting the structured half into a separate `findMany` would
 * mean re-deriving the same `WHERE` twice (once for Prisma, once for raw
 * SQL `HAVING`/`ORDER BY`) for no real benefit.
 *
 * One deliberate departure from §6's literal `GROUP BY ... HAVING` shape
 * for the equipment AND-filter: a correlated subquery
 * (`buildEquipmentCondition`) is used instead. It's equivalent (§3's AND
 * semantics: a listing matches only if its vehicle has every requested
 * equipment id) without forcing every other selected column into a
 * `GROUP BY`.
 */
import { Inject, Injectable } from '@nestjs/common';
import { db, Prisma } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type { SearchRequest, SearchResponse, SearchResult } from '@vehicles-marketplace/validation';
import type { StorageService } from '@vehicles-marketplace/storage';
import { STORAGE_SERVICE } from '../../common/storage/storage.tokens';

/** Earth's radius in miles, for the Haversine distance expression (§6). */
const EARTH_RADIUS_MILES = 3959;

/** pg_trgm similarity threshold (§6) — permissive enough to match "M4 Comp xDrive" against the canonical alias, strict enough not to return unrelated derivatives. */
const TRIGRAM_SIMILARITY_THRESHOLD = 0.2;

interface SearchRow {
  listing_id: string;
  vehicle_id: string;
  price_pence: number;
  title: string | null;
  status: string;
  published_at: Date | null;
  location_postcode_area: string | null;
  thumbnail_path: string | null;

  make_id: string;
  make_name: string;
  model_id: string;
  model_name: string;
  generation_id: string;
  generation_code: string;
  derivative_id: string;
  derivative_name: string;

  body_style: string;
  fuel: string;
  transmissions: string[];
  drivetrain: string;
  power_bhp: number | null;

  mileage_miles: number;
  first_registered_at: Date | null;
  colour_family: string | null;

  distance_miles: number | null;
}

@Injectable()
export class SearchService {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  async search(input: SearchRequest): Promise<SearchResponse> {
    const conditions = this.buildConditions(input);
    const whereClause = Prisma.join(conditions, ' AND ');
    const orderBySql = this.buildOrderBy(input);
    const distanceSql = this.buildDistanceExpression(input);
    const take = input.pageSize;
    const skip = (input.page - 1) * input.pageSize;

    const fromJoins = Prisma.sql`
      FROM listings
      JOIN vehicles ON vehicles.id = listings.vehicle_id
      JOIN derivatives ON derivatives.id = vehicles.derivative_id
      JOIN generations ON generations.id = derivatives.generation_id
      JOIN models ON models.id = generations.model_id
      JOIN makes ON makes.id = models.make_id
      WHERE ${whereClause}
    `;

    const [rows, countRows] = await Promise.all([
      db.$queryRaw<SearchRow[]>(Prisma.sql`
        SELECT
          listings.id AS listing_id,
          listings.vehicle_id AS vehicle_id,
          listings.price_pence AS price_pence,
          listings.title AS title,
          listings.status AS status,
          listings.published_at AS published_at,
          listings.location_postcode_area AS location_postcode_area,
          (
            SELECT media.thumbnail_path FROM media
            WHERE media.listing_id = listings.id
            ORDER BY media.position ASC
            LIMIT 1
          ) AS thumbnail_path,

          makes.id AS make_id,
          makes.name AS make_name,
          models.id AS model_id,
          models.name AS model_name,
          generations.id AS generation_id,
          generations.code AS generation_code,
          derivatives.id AS derivative_id,
          derivatives.name AS derivative_name,

          derivatives.body_style AS body_style,
          derivatives.fuel AS fuel,
          derivatives.transmissions AS transmissions,
          derivatives.drivetrain AS drivetrain,
          derivatives.power_bhp AS power_bhp,

          vehicles.mileage_miles AS mileage_miles,
          vehicles.first_registered_at AS first_registered_at,
          vehicles.colour_family AS colour_family,

          ${distanceSql} AS distance_miles
        ${fromJoins}
        ORDER BY ${orderBySql}
        LIMIT ${take} OFFSET ${skip}
      `),
      db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count ${fromJoins}
      `),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      searchId: createId('srch'),
      items: rows.map((row) => this.toSearchResult(row)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    };
  }

  /** §6's always-applied visibility rules, plus every structured filter from §5 that was actually supplied. */
  private buildConditions(input: SearchRequest): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [
      // Plan 11 §3's public-visibility rule — kept in lockstep with
      // `ListingsService.PUBLICLY_VISIBLE_STATUSES` by hard-coding the same
      // two values (no shared constant exists to import; see
      // `listings.service.ts`'s own comment on why that's current house
      // style, not an oversight).
      Prisma.sql`listings.status IN ('LIVE', 'RESERVED')`,
      // Plan 09 §6's rule — only an approved derivative is searchable.
      Prisma.sql`derivatives.status = 'APPROVED'`,
    ];

    if (input.query) {
      conditions.push(this.buildFreeTextCondition(input.query));
    }
    if (input.makeIds?.length) {
      conditions.push(Prisma.sql`makes.id = ANY(${input.makeIds})`);
    }
    if (input.modelIds?.length) {
      conditions.push(Prisma.sql`models.id = ANY(${input.modelIds})`);
    }
    if (input.generationIds?.length) {
      conditions.push(Prisma.sql`generations.id = ANY(${input.generationIds})`);
    }
    if (input.derivativeIds?.length) {
      conditions.push(Prisma.sql`derivatives.id = ANY(${input.derivativeIds})`);
    }

    if (input.minPricePence !== undefined) {
      conditions.push(Prisma.sql`listings.price_pence >= ${input.minPricePence}`);
    }
    if (input.maxPricePence !== undefined) {
      conditions.push(Prisma.sql`listings.price_pence <= ${input.maxPricePence}`);
    }
    if (input.minYear !== undefined) {
      conditions.push(
        Prisma.sql`EXTRACT(YEAR FROM vehicles.first_registered_at) >= ${input.minYear}`,
      );
    }
    if (input.maxYear !== undefined) {
      conditions.push(
        Prisma.sql`EXTRACT(YEAR FROM vehicles.first_registered_at) <= ${input.maxYear}`,
      );
    }
    if (input.minMileage !== undefined) {
      conditions.push(Prisma.sql`vehicles.mileage_miles >= ${input.minMileage}`);
    }
    if (input.maxMileage !== undefined) {
      conditions.push(Prisma.sql`vehicles.mileage_miles <= ${input.maxMileage}`);
    }

    if (input.fuel?.length) {
      conditions.push(Prisma.sql`derivatives.fuel = ANY(${input.fuel}::"Fuel"[])`);
    }
    if (input.transmission?.length) {
      conditions.push(
        Prisma.sql`derivatives.transmissions && ${input.transmission}::"Transmission"[]`,
      );
    }
    if (input.drivetrain?.length) {
      conditions.push(
        Prisma.sql`derivatives.drivetrain = ANY(${input.drivetrain}::"Drivetrain"[])`,
      );
    }
    if (input.bodyStyle?.length) {
      conditions.push(Prisma.sql`derivatives.body_style = ANY(${input.bodyStyle}::"BodyStyle"[])`);
    }
    if (input.colourFamily?.length) {
      conditions.push(
        Prisma.sql`vehicles.colour_family = ANY(${input.colourFamily}::"ColourFamily"[])`,
      );
    }

    if (input.minPowerBhp !== undefined) {
      conditions.push(Prisma.sql`derivatives.power_bhp >= ${input.minPowerBhp}`);
    }
    if (input.minTorqueNm !== undefined) {
      conditions.push(Prisma.sql`derivatives.torque_nm >= ${input.minTorqueNm}`);
    }
    if (input.maxZeroToSixtyTwo !== undefined) {
      conditions.push(
        Prisma.sql`derivatives.zero_to_sixty_two_seconds <= ${input.maxZeroToSixtyTwo}`,
      );
    }
    if (input.engineFamily?.length) {
      conditions.push(Prisma.sql`derivatives.engine_family = ANY(${input.engineFamily})`);
    }

    if (input.equipmentIds?.length) {
      conditions.push(this.buildEquipmentCondition(input.equipmentIds));
    }

    if (input.boundingBox) {
      const { north, south, east, west } = input.boundingBox;
      conditions.push(Prisma.sql`listings.latitude BETWEEN ${south} AND ${north}`);
      conditions.push(Prisma.sql`listings.longitude BETWEEN ${west} AND ${east}`);
    }

    if (
      input.maxDistanceMiles !== undefined &&
      input.originLatitude !== undefined &&
      input.originLongitude !== undefined
    ) {
      conditions.push(
        Prisma.sql`${this.haversineExpression(input.originLatitude, input.originLongitude)} <= ${input.maxDistanceMiles}`,
      );
    }

    return conditions;
  }

  /** §3's decision row — free text matches via `pg_trgm` similarity against `CatalogueAlias.alias` and `Derivative.name`/`Generation.code`, combined (not a separate search mode) with every structured filter above. Shared with `buildOrderBy`'s `RELEVANCE` sort, so a listing that only matches through an alias (e.g. "M4 Comp xDrive") is scored — and ranked — on that match, not just on `Derivative.name`/`Generation.code` similarity. */
  private relevanceExpression(query: string): Prisma.Sql {
    return Prisma.sql`GREATEST(
      similarity(derivatives.name, ${query}),
      similarity(generations.code, ${query}),
      COALESCE((
        SELECT MAX(similarity(catalogue_aliases.alias, ${query})) FROM catalogue_aliases
        WHERE catalogue_aliases.entity_type = 'DERIVATIVE'
          AND catalogue_aliases.entity_id = derivatives.id
      ), 0)
    )`;
  }

  private buildFreeTextCondition(query: string): Prisma.Sql {
    return Prisma.sql`${this.relevanceExpression(query)} > ${TRIGRAM_SIMILARITY_THRESHOLD}`;
  }

  /** §3's AND semantics: matches only if the vehicle has every requested equipment id, not any one of them. */
  private buildEquipmentCondition(equipmentIds: string[]): Prisma.Sql {
    return Prisma.sql`(
      SELECT COUNT(DISTINCT vehicle_equipment.equipment_id) FROM vehicle_equipment
      WHERE vehicle_equipment.vehicle_id = vehicles.id
        AND vehicle_equipment.equipment_id = ANY(${equipmentIds})
    ) = ${equipmentIds.length}
  `;
  }

  /** §6 — a plain Haversine expression (no PostGIS). `NULL` (and so excluded from `maxDistanceMiles`/never ordered as "closest") for a listing with no geocoded coordinates. */
  private haversineExpression(originLat: number, originLng: number): Prisma.Sql {
    return Prisma.sql`(
      ${EARTH_RADIUS_MILES} * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${originLat})) * cos(radians(listings.latitude)) *
            cos(radians(listings.longitude) - radians(${originLng})) +
          sin(radians(${originLat})) * sin(radians(listings.latitude))
        ))
      )
    )`;
  }

  private buildDistanceExpression(input: SearchRequest): Prisma.Sql {
    if (input.originLatitude === undefined || input.originLongitude === undefined) {
      return Prisma.sql`NULL::double precision`;
    }
    return this.haversineExpression(input.originLatitude, input.originLongitude);
  }

  /** §6's `ORDER BY [relevance | price | mileage | year | distance]`. A `relevance`-sorted search with no free-text `query` falls back to newest-first, since there's no similarity score to rank by. */
  private buildOrderBy(input: SearchRequest): Prisma.Sql {
    switch (input.sort) {
      case 'PRICE_ASC':
        return Prisma.sql`listings.price_pence ASC, listings.id ASC`;
      case 'PRICE_DESC':
        return Prisma.sql`listings.price_pence DESC, listings.id ASC`;
      case 'MILEAGE_ASC':
        return Prisma.sql`vehicles.mileage_miles ASC, listings.id ASC`;
      case 'YEAR_DESC':
        return Prisma.sql`vehicles.first_registered_at DESC NULLS LAST, listings.id ASC`;
      case 'DISTANCE_ASC':
        // §5's own `.refine()` guarantees origin* is set whenever this sort is chosen.
        return Prisma.sql`${this.haversineExpression(input.originLatitude as number, input.originLongitude as number)} ASC NULLS LAST, listings.id ASC`;
      case 'RELEVANCE':
      default:
        if (input.query) {
          return Prisma.sql`${this.relevanceExpression(input.query)} DESC, listings.published_at DESC NULLS LAST, listings.id ASC`;
        }
        return Prisma.sql`listings.published_at DESC NULLS LAST, listings.id ASC`;
    }
  }

  private toSearchResult(row: SearchRow): SearchResult {
    return {
      listingId: row.listing_id,
      vehicleId: row.vehicle_id,
      pricePence: row.price_pence,
      title: row.title,
      thumbnailUrl: row.thumbnail_path ? this.storage.getUrl(row.thumbnail_path) : null,
      status: row.status as SearchResult['status'],
      publishedAt: row.published_at ? row.published_at.toISOString() : null,

      makeId: row.make_id,
      makeName: row.make_name,
      modelId: row.model_id,
      modelName: row.model_name,
      generationId: row.generation_id,
      generationCode: row.generation_code,
      derivativeId: row.derivative_id,
      derivativeName: row.derivative_name,

      bodyStyle: row.body_style as SearchResult['bodyStyle'],
      fuel: row.fuel as SearchResult['fuel'],
      transmissions: row.transmissions as SearchResult['transmissions'],
      drivetrain: row.drivetrain as SearchResult['drivetrain'],
      powerBhp: row.power_bhp,

      mileageMiles: row.mileage_miles,
      firstRegisteredAt: row.first_registered_at ? row.first_registered_at.toISOString() : null,
      colourFamily: row.colour_family as SearchResult['colourFamily'],

      locationPostcodeArea: row.location_postcode_area,
      distanceMiles: row.distance_miles,
    };
  }
}
