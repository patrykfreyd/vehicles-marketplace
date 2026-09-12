# Plan 11 — Vehicle & Listing Data Model

Status: Draft
Depends on: Plan 06 (`Vehicle`/`Listing` stubs this plan extends), Plan 07
(`User`/`SellerProfile`), Plan 08 (`Derivative`/`Equipment`/
`ManufacturerColour` this plan references), Plan 09 (only `APPROVED`
derivatives are referenceable), Plan 10 (`VehicleLookup` feeds a new
`Vehicle`)
Blocks: Plan 12 (Media references `Listing`), Plan 13 (Search indexes
these fields), Plan 15 (Vehicle Detail page reads this data), Plan 17
(Saved items reference `Listing`), Plan 20 (the advert wizard's UX is
built *on top of* the CRUD endpoints this plan creates — see §8), Plan 22
(Pricing reads `ListingPriceHistory`), Plan 23 (Seller Dashboard reads
`publishedAt`/`soldAt` for funnel timing)

## 1. Objective

Give the physical vehicle and the marketplace advert their full V1 shape —
history, equipment, modifications on the vehicle side; price, status
lifecycle, and price history on the listing side — extending Plan 06's
deliberately bare stubs into what the catalogue doc's §9–§11 and the
functions doc's price-history/status features actually need. This plan
also builds the **basic CRUD API** for both entities (create, read,
update, ownership-guarded status transitions) — the advert *wizard* UX
that calls these endpoints step-by-step is Plan 20's job, not this one.

"Done" means: a `Vehicle` can be created from a confirmed `VehicleLookup`
(Plan 10) plus seller-supplied condition/history/equipment/modification
data, a `Listing` can be created against it, its price can change with a
recorded history entry, its status can move through the defined lifecycle
with ownership enforced, and only `LIVE`/`RESERVED` listings are visible
to anyone other than the owning seller or an admin.

## 2. Decisions carried over from the idea docs

- Vehicle-specific data (registration, mileage, colour, equipment,
  service history, modifications) is supplied by the seller/DVLA, never
  by the catalogue (catalogue doc §9) — this plan is where that split
  becomes real tables, not just a principle.
- Equipment is **vehicle-level only** — no catalogue-to-derivative
  equipment link exists (confirmed already in Plan 08 §5); this plan adds
  the `VehicleEquipment` join that actually was missing until now.
- Modifications don't overwrite factory specs — a vehicle's declared
  power is a seller claim tracked separately from the derivative's factory
  `powerBhp` (catalogue doc §10).
- Buyers see listing **price history** (functions doc §14: "02 Sep —
  Listed £26,495 / 07 Sep — £25,995 ↓£500 / ...").
- Listing lifecycle includes **Pause** and **Mark Reserved/Sold** (pages
  doc's seller "Manage Advert" section) — Plan 06's stub only had
  `DRAFT/LIVE/RESERVED/SOLD/ARCHIVED`; this plan adds `PAUSED`.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Vehicle↔Listing cardinality | **One-to-one** (`Listing.vehicleId` unique) — a fresh `Vehicle` row is created per "Sell a car" attempt, even for a previously-seen registration | Keeps ownership/history unambiguous for V1. No cross-owner deduplication by registration (e.g. recognizing "this car was sold on the platform before, now under a new owner") — genuinely useful as a future trust signal, but adds real complexity (who's allowed to see the old listing, does mileage/history carry over) that isn't needed for launch. Revisit only as a dedicated future feature |
| Registration visibility to buyers | **Mask by default** — buyers see a partial plate (e.g. `YA22 ***`) on the public listing; the full registration is visible only to the seller, an admin, and (recommendation) a buyer who has an active conversation/viewing request with the seller | Neither idea doc raises this, but showing a full, searchable registration plate publicly is a real privacy/anti-cloning risk real UK marketplaces actively avoid — cheap to mask now, awkward to retrofit after launch |
| Listing visibility rule | Public search/detail surfaces only ever return `LIVE` or `RESERVED` listings; `DRAFT`/`PAUSED`/`SOLD`/`ARCHIVED` are visible only to the owning seller or an admin | Stated here as a data-contract rule so Plan 13 (Search) and Plan 15 (Detail page) build their queries against one agreed rule instead of each inventing their own filter |
| Ownership enforcement | Every mutating endpoint checks `listing.sellerId === currentUser.id \|\| currentUser.isAdmin`, written explicitly per Plan 07 §5's rule (no generic ownership guard) | Consistent with the pattern already fixed in Plan 07 |
| Basic CRUD vs. wizard UX | **This plan** builds the Vehicles/Listings NestJS modules (create/read/update, status transitions) as reusable, wizard-agnostic endpoints; **Plan 20** builds the multi-step guided UX (draft-save/resume across steps, step-level validation ordering) that calls them | Prevents Plan 20 from re-deciding data shape/ownership rules that belong here, and lets this plan's endpoints be tested independently of any particular UI flow |

## 4. New enums

```prisma
enum ServiceHistoryType { FULL PARTIAL NONE UNKNOWN }
enum WriteOffCategory { CAT_A CAT_B CAT_S CAT_N }
enum ModificationCategory {
  ECU_TUNE EXHAUST INTAKE FORCED_INDUCTION SUSPENSION BRAKES
  WHEELS BODYWORK INTERIOR AUDIO OTHER
}
enum EquipmentSource { SELLER_DECLARED AI_DETECTED }
enum SellerType { PRIVATE DEALER }
```

Extends Plan 06's `ListingStatus`:

```prisma
enum ListingStatus { DRAFT LIVE PAUSED RESERVED SOLD ARCHIVED }
```

One sanctioned cross-plan touch, in the same spirit as Plan 06 §7's
Better Auth exception: this plan adds `type: SellerType @default(PRIVATE)`
to Plan 07's `SellerProfile` model, since the mockups render a seller-type
badge ("Private seller" / "Trade seller") that needs to exist before
Plan 33 (Dealer Functionality) does the real dealer buildout.

## 5. Prisma schema — `Vehicle` (extends Plan 06's stub)

```prisma
model Vehicle {
  id              String   @id
  ownerId         String   @map("owner_id")
  owner           User     @relation(fields: [ownerId], references: [id])
  derivativeId    String?  @map("derivative_id")     // set once confirmed via Plan 10
  derivative      Derivative? @relation(fields: [derivativeId], references: [id])
  vehicleLookupId String?  @unique @map("vehicle_lookup_id")

  registration       String
  firstRegisteredAt  DateTime? @map("first_registered_at")
  mileageMiles       Int
  ownersCount        Int?     @map("owners_count")

  colourFamily            ColourFamily?      @map("colour_family")
  manufacturerColourId    String?            @map("manufacturer_colour_id")
  manufacturerColour      ManufacturerColour? @relation(fields: [manufacturerColourId], references: [id])

  interiorDescription     String?  @map("interior_description")   // "Silverstone / Black"
  upholstery              String?

  ukSupplied     Boolean  @default(true) @map("uk_supplied")
  imported       Boolean  @default(false)
  importCountry  String?  @map("import_country")

  serviceHistoryType      ServiceHistoryType? @map("service_history_type")
  mainDealerHistory       Boolean?  @map("main_dealer_history")
  serviceRecordsAvailable Boolean?  @map("service_records_available")

  accidentDeclared  Boolean @default(false) @map("accident_declared")
  writeOffCategory  WriteOffCategory? @map("write_off_category")

  dvlaTaxStatus     String?   @map("dvla_tax_status")
  dvlaMotStatus     String?   @map("dvla_mot_status")
  dvlaMotExpiryDate DateTime? @map("dvla_mot_expiry_date")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  equipment     VehicleEquipment[]
  modifications VehicleModification[]
  listing       Listing?

  @@index([ownerId])
  @@map("vehicles")
}

model VehicleEquipment {
  id          String          @id
  vehicleId   String          @map("vehicle_id")
  vehicle     Vehicle         @relation(fields: [vehicleId], references: [id])
  equipmentId String          @map("equipment_id")
  equipment   Equipment       @relation(fields: [equipmentId], references: [id])
  source      EquipmentSource @default(SELLER_DECLARED)

  @@unique([vehicleId, equipmentId])
  @@map("vehicle_equipment")
}

model VehicleModification {
  id          String               @id
  vehicleId   String               @map("vehicle_id")
  vehicle     Vehicle              @relation(fields: [vehicleId], references: [id])
  category    ModificationCategory
  brand       String?
  product     String?
  description String?

  @@map("vehicle_modifications")
}
```

`derivativeId` is nullable to allow a `Vehicle` to exist in a `DRAFT`
listing state before the seller has confirmed a derivative (e.g. manual
matching still in progress, per Plan 10 §6) — Plan 20's wizard is
responsible for refusing to publish (`LIVE`) a listing whose vehicle has
no confirmed `derivativeId`.

## 6. Prisma schema — `Listing` (extends Plan 06's stub)

```prisma
model Listing {
  id         String        @id
  vehicleId  String        @unique @map("vehicle_id")   // 1:1, see §3
  vehicle    Vehicle       @relation(fields: [vehicleId], references: [id])
  sellerId   String        @map("seller_id")
  seller     User          @relation(fields: [sellerId], references: [id])

  status       ListingStatus @default(DRAFT)
  pricePence   Int
  title        String?
  description  String?       @db.Text

  locationPostcodeArea String?  @map("location_postcode_area")
  locationCountry      String?  @default("GB") @map("location_country")

  publishedAt DateTime? @map("published_at")
  reservedAt  DateTime? @map("reserved_at")
  soldAt      DateTime? @map("sold_at")
  archivedAt  DateTime? @map("archived_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  priceHistory ListingPriceHistory[]
  media        Media[]

  @@index([status])
  @@map("listings")
}

model ListingPriceHistory {
  id         String   @id
  listingId  String   @map("listing_id")
  listing    Listing  @relation(fields: [listingId], references: [id])
  pricePence Int      @map("price_pence")
  changedAt  DateTime @default(now()) @map("changed_at")

  @@index([listingId])
  @@map("listing_price_history")
}
```

`publishedAt`/`reservedAt`/`soldAt`/`archivedAt` are set by the status-
transition endpoint (§8) as each transition happens — this is enough to
compute "days to sale" (`soldAt - publishedAt`) for Plan 23's dashboard
without needing a full generic status-event-log table; the richer
funnel/timing analytics (time to first enquiry, impressions, etc.) come
from Plan 27's `analytics_events`, not from this table.

## 7. Status lifecycle (enforced by the service layer, §8)

```text
DRAFT → LIVE          (requires: vehicle.derivativeId set, at least one
                        photo per Plan 12, price set) — sets publishedAt
LIVE → PAUSED          → PAUSED clears nothing, just hides from search
PAUSED → LIVE
LIVE/PAUSED → RESERVED  — sets reservedAt
RESERVED → LIVE          (buyer fell through)
LIVE/RESERVED → SOLD    — sets soldAt
Any non-SOLD → ARCHIVED  — sets archivedAt, terminal
```

A price change while `status IN (DRAFT, LIVE, PAUSED, RESERVED)` inserts a
`ListingPriceHistory` row automatically as part of the same transaction
that updates `Listing.pricePence` — never a separate, easy-to-forget step.

## 8. API modules (`apps/api/src/modules/vehicles`, `.../listings`)

```text
POST   /api/v1/vehicles                     create (from a confirmed VehicleLookup + seller-supplied fields)
PATCH  /api/v1/vehicles/:id                 update condition/history/equipment/modifications
POST   /api/v1/vehicles/:id/equipment       add a VehicleEquipment row
DELETE /api/v1/vehicles/:id/equipment/:eqId
POST   /api/v1/vehicles/:id/modifications
DELETE /api/v1/vehicles/:id/modifications/:modId

POST   /api/v1/listings                     create (against a vehicleId the caller owns)
GET    /api/v1/listings/:id                 visibility rule from §3 applied here
PATCH  /api/v1/listings/:id                 price/title/description/location — price change → §7
POST   /api/v1/listings/:id/status          body: { status } — validated against §7's transition table
GET    /api/v1/listings?sellerId=me&status=...   seller's own listings (Plan 20/23 consume this)
```

Every mutating route: ownership check per §3, request/response validated
against Zod schemas in `packages/validation/src/vehicle` and
`.../listing` (per Plan 03's conventions), inline-validatable field
errors flow through the `ApiErrorSchema` contract from Plan 03 §6 exactly
as any other form in the product.

## 9. Out of scope for this plan

- The guided multi-step wizard UX, draft-resume-across-sessions UI, and
  registration-lookup screen → **Plan 20** (built on §8's endpoints)
- Photo upload/processing, `Media`'s image-category fields → **Plan 12**
- AI-assisted description/completeness-check generation → **Plan 21**
- AI/market-based price recommendation → **Plan 22**
- Full-text/filtered search over these fields → **Plan 13**
- Seller performance funnel, impressions/views aggregation → **Plan 23**,
  **Plan 27/28**
- Outstanding-finance/write-off verification beyond the seller's own
  declaration → **Plan 30**

## 10. Acceptance criteria

- [ ] A `Vehicle` can be created referencing a confirmed `VehicleLookup`
      and an `APPROVED` derivative; creating one against a non-`APPROVED`
      or nonexistent derivative is rejected.
- [ ] A `Listing` can be created against a vehicle the caller owns;
      attempting it against another user's vehicle returns 403.
- [ ] Changing `pricePence` inserts exactly one `ListingPriceHistory` row
      in the same transaction, reproducing the functions doc's example
      price-history sequence when done three times in a row.
- [ ] Every transition in §7's table succeeds when valid and is rejected
      (with a clear `ApiError`) when invalid (e.g. `DRAFT → SOLD` directly).
- [ ] `DRAFT → LIVE` is rejected when `vehicle.derivativeId` is null or no
      price is set, with a field-appropriate error.
- [ ] A `GET /listings/:id` request for a `DRAFT` listing from a user who
      isn't its seller (and isn't admin) returns 404 (not 403 — never
      confirm a draft listing's existence to a stranger).
- [ ] The public listing response masks the registration per §3; the
      seller's own `GET` of their listing returns the full registration.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 11. Open questions for you

1. Confirm registration masking for buyers (§3) — full masking, or would
   you rather reveal the full plate only after a viewing is confirmed
   (stronger anti-fraud, more friction), or not mask at all?
2. Confirm 404 (not 403) for a stranger requesting a non-visible listing
   — deliberate to avoid confirming a draft/sold listing's existence; any
   reason you'd want 403 instead?
3. Confirm one-to-one Vehicle↔Listing for V1 (§3), postponing cross-owner
   registration deduplication ("this car was sold here before") as a
   future trust-signal feature rather than building it now.
