# Plan 28 — Analytics Aggregation & Admin Reporting

Status: Draft
Depends on: Plan 27 (`analytics_events` — this plan's sole raw input),
Plan 09 (the `/admin` area/layout this plan extends), Plan 07 (`isAdmin`
gate), Plan 04 (dashboard UI components)
Blocks: nothing structurally downstream

## 1. Objective

Build the BullMQ aggregation workers, a prioritized subset of daily
aggregate tables, and the internal admin analytics dashboard — turning
Plan 27's raw event log into the business-health reporting
`idea/marketplace_analytics_user_engagement_tracking.md` §30–31 describes,
including the specific "Marketplace Demand Gap" report (§12) with its own
concrete worked example.

"Done" means: an admin can see real daily active users, search success
rate, the demand-gap report surfacing repeated zero-result searches
against current inventory, and marketplace-health metrics broken down by
make/model/region — all computed from Plan 27's real event data, refreshed
nightly.

## 2. How this plan relates to the two other "aggregation-shaped" plans

Worth stating clearly in one place, since three plans now touch
aggregation and could otherwise read as overlapping:

```text
Plan 13 (Search)   — explicitly rejected a denormalized search read-model;
                      queries stay live/joined at V1 scale (unrelated to
                      analytics — a search-performance decision)

Plan 23 (Seller)   — owns ListingMetricsDaily: a simple, purpose-built
                      per-listing counter table for the seller's own
                      funnel dashboard, deliberately kept separate from
                      Plan 27's richer event system (Plan 23 §2)

Plan 28 (this plan) — consumes Plan 27's analytics_events to build
                      BUSINESS-WIDE aggregates for the ADMIN dashboard —
                      a different table, different audience, different
                      purpose from Plan 23's per-listing seller counters
```

None of these three are the same system, and this plan does not touch or
replace Plan 23's `ListingMetricsDaily`.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Which aggregate tables to build now | A **prioritized subset**: one consolidated `MarketplaceMetricsDaily` covering the analytics doc §31 "Important Business Metrics" list, plus `SearchMetricsDaily` and `CatalogueMetricsDaily` specifically (these two directly power the Demand Gap report, §4) — `TrafficMetricsDaily`, `SellerMetricsDaily`, and `AiMetricsDaily` deferred | The analytics doc's own §37 explicitly says "these do not all need to exist in V1. Create them when reporting requirements justify them" — building all six mechanically because they're listed would be scope creep the source material itself warns against |
| Aggregate table vs. direct query | Only the **high-frequency, dashboard-widget** metrics (§31's core numbers, rendered on every admin dashboard load) get pre-aggregated tables; **exploratory/periodic** reports (marketing attribution funnels, the demand-gap report) query `analytics_events` **directly**, with a sensible default date range (e.g. last 90 days) to bound the scan | Pre-aggregating every possible report is unnecessary cost — a report a marketer runs occasionally doesn't need sub-second load the way a daily-active-users widget does; this keeps the number of aggregate tables honest rather than mechanical |
| Dashboard location | Extend the existing `/admin` area (Plan 09's Catalogue Admin already lives there) with `/admin/analytics` — same layout shell, same `isAdmin` gate, not a separate app | Consistent with Plan 09/19's established pattern of one gated internal area, not a proliferation of separate admin tools |
| Chart implementation | Follow this workspace's dataviz guidance when the actual chart components are built | Not a decision this planning document needs to make itself — flagged so the implementation phase knows to load that guidance before writing chart code |

## 4. The Marketplace Demand Gap report (called out specifically)

This is one of the analytics doc's most concrete, directly actionable
features (§12's own worked example):

```text
1. Porsche 911 991.2 Manual — 428 searches, 0 available cars
2. BMW M3 G80 Isle of Man Green — 317 searches, 0 available cars
3. Audi TT RS 8S Nardo Grey — 291 searches, 0 available cars
```

Built as a direct query (per §3) over `SEARCH_ZERO_RESULTS` events,
grouped by normalized search criteria, ranked by frequency, cross-checked
against current live inventory to confirm zero supply still holds. This
feeds seller/dealer acquisition targeting and catalogue-priority decisions
directly — explicitly worth naming as its own dashboard feature rather
than folding into generic "search reporting."

## 5. Aggregate tables (this plan's scope, per §3)

```prisma
model MarketplaceMetricsDaily {
  id                    String   @id
  date                  DateTime @db.Date
  dailyActiveUsers      Int      @map("daily_active_users")
  registrations         Int
  searchesPerformed     Int      @map("searches_performed")
  searchZeroResultRate  Float    @map("search_zero_result_rate")
  liveListings          Int      @map("live_listings")
  newListings           Int      @map("new_listings")
  listingsSold          Int      @map("listings_sold")
  totalImpressions      Int      @map("total_impressions")
  totalViews            Int      @map("total_views")
  totalLikes            Int
  totalWatchlists       Int      @map("total_watchlists")
  totalEnquiries        Int      @map("total_enquiries")
  totalViewingRequests  Int      @map("total_viewing_requests")
  avgDaysToSale         Float?   @map("avg_days_to_sale")

  @@unique([date])
  @@map("marketplace_metrics_daily")
}

model SearchMetricsDaily {
  id             String   @id
  date           DateTime @db.Date
  searchType     String   @map("search_type")   // STANDARD | ADVANCED | AI_SEARCH | DISCOVER
  searchCount    Int      @map("search_count")
  zeroResultCount Int     @map("zero_result_count")
  avgResultCount Float    @map("avg_result_count")

  @@unique([date, searchType])
  @@map("search_metrics_daily")
}

model CatalogueMetricsDaily {
  id           String   @id
  date         DateTime @db.Date
  makeId       String?  @map("make_id")
  modelId      String?  @map("model_id")
  generationId String?  @map("generation_id")
  pageViews    Int      @map("page_views")
  searchAppearances Int @map("search_appearances")

  @@unique([date, makeId, modelId, generationId])
  @@map("catalogue_metrics_daily")
}
```

One nightly BullMQ job (same worker process as Plan 12/23) reads the
prior day's `analytics_events` and writes these three tables.

## 6. Admin dashboard sections

```text
/admin/analytics
├── Overview          — MarketplaceMetricsDaily trends (DAU, registrations, etc.)
├── Search            — SearchMetricsDaily by type, success/zero-result rates
├── Demand Gap         — §4's report
├── Catalogue          — CatalogueMetricsDaily, which makes/models drive traffic
└── Marketing Attribution — direct query over analytics_events by campaign,
                              per the analytics doc §27's funnel example
```

Every screen breaks down by the dimensions the analytics doc calls for
where the underlying data supports it (make/model/generation, region,
device, web/mobile) — implemented as filter controls over the same
aggregate/query, not separate pages per dimension.

## 7. Out of scope for this plan

- `TrafficMetricsDaily`, `SellerMetricsDaily`, `AiMetricsDaily` — deferred
  per §3, added later only if reporting need justifies them
- Personalization/recommendation model training on this data → **Plan 29**
- Any change to Plan 23's `ListingMetricsDaily` or its seller-facing
  dashboard → untouched, per §2
- Real-time (sub-daily) dashboard refresh — nightly aggregation is
  sufficient for V1 business reporting

## 8. Acceptance criteria

- [ ] The nightly aggregation job correctly populates
      `MarketplaceMetricsDaily`/`SearchMetricsDaily`/`CatalogueMetricsDaily`
      from a fixture day's `analytics_events`, matching hand-computed
      expected values.
- [ ] The Demand Gap report reproduces a fixture scenario equivalent to
      the analytics doc's own worked example (repeated zero-result
      searches with confirmed zero current supply).
- [ ] The Marketing Attribution view correctly reconstructs a fixture
      campaign→visitor→search→view→enquiry funnel from raw events.
- [ ] `/admin/analytics` is inaccessible to a non-admin user and
      functions correctly for an admin, reusing Plan 09's existing gate/
      layout.
- [ ] Direct-query reports respect their default date-range bound rather
      than scanning the entire `analytics_events` table unbounded.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm the prioritized subset in §3 (Marketplace/Search/Catalogue
   metrics now, Traffic/Seller/AI metrics deferred) rather than building
   all six aggregate tables up front.
2. Any specific dimension breakdown (region, device type, web vs. mobile)
   you consider essential for V1's dashboard rather than a later addition?
3. Confirm the 90-day default date-range bound on exploratory/direct-query
   reports, or would you like it tuned differently?
