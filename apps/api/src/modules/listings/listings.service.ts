/**
 * plans/11-vehicle-listing-data-model.md §6/§7/§8 — the Listing CRUD and
 * status-lifecycle business logic. Controllers depend only on this service
 * (Plan 05 §5's module template rule).
 */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, type Listing as ListingRow } from '@vehicles-marketplace/db';
import { createId } from '@vehicles-marketplace/utils';
import type {
  CreateListingRequest,
  CurrentUser as CurrentUserType,
  Listing,
  ListListingsQuery,
  PageResponse,
  UpdateListingRequest,
} from '@vehicles-marketplace/validation';
import { maskRegistration } from '@vehicles-marketplace/validation';
import { VehiclesService } from '../vehicles/vehicles.service';

/**
 * §7's allowed-transition table. `SOLD`/`ARCHIVED` have no outgoing
 * transitions — both are terminal for this plan's lifecycle.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['LIVE', 'ARCHIVED'],
  LIVE: ['PAUSED', 'RESERVED', 'SOLD', 'ARCHIVED'],
  PAUSED: ['LIVE', 'RESERVED', 'ARCHIVED'],
  RESERVED: ['LIVE', 'SOLD', 'ARCHIVED'],
  SOLD: [],
  ARCHIVED: [],
};

/** §3's public-visibility rule: only these statuses are ever shown to anyone other than the owning seller or an admin. */
const PUBLICLY_VISIBLE_STATUSES = new Set(['LIVE', 'RESERVED']);

@Injectable()
export class ListingsService {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** §10's second acceptance criterion — creating against a vehicle the caller doesn't own is a 403 (`VehiclesService.requireOwnedVehicle` already draws exactly this line). */
  async create(currentUser: CurrentUserType, input: CreateListingRequest): Promise<Listing> {
    const vehicle = await this.vehiclesService.requireOwnedVehicle(input.vehicleId, currentUser);

    const existingListing = await db.listing.findUnique({ where: { vehicleId: vehicle.id } });
    if (existingListing) {
      throw new ConflictException('This vehicle already has a listing.');
    }

    const listingId = createId('lst');
    const listing = await db.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          id: listingId,
          vehicleId: vehicle.id,
          sellerId: currentUser.id,
          pricePence: input.pricePence,
          title: input.title,
          description: input.description,
          locationPostcodeArea: input.locationPostcodeArea,
          locationCountry: input.locationCountry,
        },
      });
      await tx.listingPriceHistory.create({
        data: { id: createId('lph'), listingId: created.id, pricePence: created.pricePence },
      });
      return created;
    });

    const vehicleDetail = await this.vehiclesService.toVehicleWithLinks(vehicle);
    return this.toListing(listing, vehicleDetail, [
      { id: listingId, pricePence: listing.pricePence, changedAt: listing.createdAt.toISOString() },
    ]);
  }

  /** §3/§10 — visible to anyone if `LIVE`/`RESERVED`; otherwise only the owning seller or an admin, and a stranger gets 404 (never a 403 — don't confirm a hidden listing's existence). Registration is masked for anyone but the owner/admin (§3). */
  async getById(currentUser: CurrentUserType, listingId: string): Promise<Listing> {
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    const isOwnerOrAdmin =
      !!listing && (listing.sellerId === currentUser.id || currentUser.isAdmin);
    if (!listing || (!isOwnerOrAdmin && !PUBLICLY_VISIBLE_STATUSES.has(listing.status))) {
      throw new NotFoundException('Listing not found');
    }

    const vehicle = await db.vehicle.findUniqueOrThrow({ where: { id: listing.vehicleId } });
    const vehicleDetail = await this.vehiclesService.toVehicleWithLinks(vehicle);
    if (!isOwnerOrAdmin) {
      vehicleDetail.registration = maskRegistration(vehicleDetail.registration);
    }

    const priceHistory = await db.listingPriceHistory.findMany({
      where: { listingId },
      orderBy: { changedAt: 'asc' },
    });

    return this.toListing(
      listing,
      vehicleDetail,
      priceHistory.map((entry) => ({
        id: entry.id,
        pricePence: entry.pricePence,
        changedAt: entry.changedAt.toISOString(),
      })),
    );
  }

  /** §6/§7 — a `pricePence` change while `SOLD`/`ARCHIVED` is rejected; otherwise it inserts a `ListingPriceHistory` row in the same transaction as the update (never a separate, easy-to-forget step). */
  async update(
    currentUser: CurrentUserType,
    listingId: string,
    patch: UpdateListingRequest,
  ): Promise<Listing> {
    const listing = await this.requireOwnedListingForMutation(listingId, currentUser);

    const priceChanged = patch.pricePence !== undefined && patch.pricePence !== listing.pricePence;
    if (priceChanged && (listing.status === 'SOLD' || listing.status === 'ARCHIVED')) {
      throw new ConflictException('Cannot change the price of a sold or archived listing.');
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.listing.update({
        where: { id: listingId },
        data: {
          pricePence: patch.pricePence,
          title: patch.title,
          description: patch.description,
          locationPostcodeArea: patch.locationPostcodeArea,
          locationCountry: patch.locationCountry,
        },
      });
      if (priceChanged) {
        await tx.listingPriceHistory.create({
          data: { id: createId('lph'), listingId, pricePence: result.pricePence },
        });
      }
      return result;
    });

    return this.getById(currentUser, updated.id);
  }

  /** §7's transition table, enforced here. `-> LIVE` additionally requires a confirmed derivative, a set price, and at least one photo (§7/§10) — checked on every transition into `LIVE`, not just the first `DRAFT -> LIVE`, since a later edit could otherwise leave a live listing without them. */
  async updateStatus(
    currentUser: CurrentUserType,
    listingId: string,
    targetStatus: string,
  ): Promise<Listing> {
    const listing = await this.requireOwnedListingForMutation(listingId, currentUser);

    const allowed = ALLOWED_TRANSITIONS[listing.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictException(
        `Cannot transition listing from ${listing.status} to ${targetStatus}.`,
      );
    }

    if (targetStatus === 'LIVE') {
      await this.requirePublishable(listing);
    }

    const now = new Date();
    const updated = await db.listing.update({
      where: { id: listingId },
      data: {
        status: targetStatus as ListingRow['status'],
        publishedAt: targetStatus === 'LIVE' && !listing.publishedAt ? now : undefined,
        reservedAt: targetStatus === 'RESERVED' ? now : undefined,
        soldAt: targetStatus === 'SOLD' ? now : undefined,
        archivedAt: targetStatus === 'ARCHIVED' ? now : undefined,
      },
    });

    return this.getById(currentUser, updated.id);
  }

  async list(
    currentUser: CurrentUserType,
    query: ListListingsQuery,
  ): Promise<PageResponse<Listing>> {
    const targetSellerId = query.sellerId === 'me' ? currentUser.id : query.sellerId;
    if (targetSellerId !== currentUser.id && !currentUser.isAdmin) {
      throw new ForbiddenException("You do not have access to this seller's listings");
    }

    const where = { sellerId: targetSellerId, ...(query.status ? { status: query.status } : {}) };
    const [total, rows] = await Promise.all([
      db.listing.count({ where }),
      db.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const items = await Promise.all(rows.map((row) => this.getById(currentUser, row.id)));

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  /** §7's `DRAFT -> LIVE` precondition list. */
  private async requirePublishable(listing: ListingRow): Promise<void> {
    const vehicle = await db.vehicle.findUniqueOrThrow({ where: { id: listing.vehicleId } });
    if (!vehicle.derivativeId) {
      throw new ConflictException(
        "Confirm the vehicle's derivative before publishing this listing.",
      );
    }
    if (listing.pricePence <= 0) {
      throw new ConflictException('Set a price before publishing this listing.');
    }
    const photoCount = await db.media.count({ where: { listingId: listing.id } });
    if (photoCount === 0) {
      throw new ConflictException('Add at least one photo before publishing this listing.');
    }
  }

  /** Every mutating endpoint's ownership check (§3: `listing.sellerId === currentUser.id || currentUser.isAdmin`, written explicitly per Plan 07 §5's rule). The caller already supplied `listingId`, so a missing/foreign listing is 404/403 respectively. */
  private async requireOwnedListingForMutation(
    listingId: string,
    currentUser: CurrentUserType,
  ): Promise<ListingRow> {
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== currentUser.id && !currentUser.isAdmin) {
      throw new ForbiddenException('You do not have access to this listing');
    }
    return listing;
  }

  private toListing(
    listing: ListingRow,
    vehicle: Listing['vehicle'],
    priceHistory: Listing['priceHistory'],
  ): Listing {
    return {
      id: listing.id,
      vehicleId: listing.vehicleId,
      vehicle,
      sellerId: listing.sellerId,
      status: listing.status,
      pricePence: listing.pricePence,
      title: listing.title,
      description: listing.description,
      locationPostcodeArea: listing.locationPostcodeArea,
      locationCountry: listing.locationCountry,
      publishedAt: listing.publishedAt ? listing.publishedAt.toISOString() : null,
      reservedAt: listing.reservedAt ? listing.reservedAt.toISOString() : null,
      soldAt: listing.soldAt ? listing.soldAt.toISOString() : null,
      archivedAt: listing.archivedAt ? listing.archivedAt.toISOString() : null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      priceHistory,
    };
  }
}
