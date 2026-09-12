# Plan 23 — Seller Dashboard, Advert Performance & AI Seller Coach

Status: Draft
Depends on: Plan 11 (`Listing`), Plan 12 (photo coverage feeds Advert
Score), Plan 16/17 (`Like`/`Watchlist` tables reused for funnel counts),
Plan 21 (completeness score feeds Advert Score), Plan 22 (comparable-set
logic reused directly for Competitor Intelligence — not rebuilt)
Blocks: nothing structurally downstream

## 1. Objective

Build the seller-facing performance layer —
`idea/vehicle_marketplace_web_mobile_functions.md` §20–26: the
impressions→sold conversion funnel, a deterministic Advert Score
breakdown, AI Seller Coach recommendations, and Competitor Intelligence —
matching the exact worked examples in the mockups and functions doc
(14,821 impressions → 1,382 views → ... → sold; Advert Score 84/100;
"38 comparable cars, your price 17th cheapest").

"Done" means: a seller sees a real, correctly-computed funnel for their
listing, an Advert Score whose sub-scores are each independently
verifiable against real data, and an AI Coach whose recommendations are
grounded strictly in those already-computed real numbers — never an
invented statistic.

## 2. An important resolution: this plan does not wait for Plan 27

This is the biggest sequencing issue in the whole plan series worth being
explicit about. The funnel this plan needs (impressions, views, likes,
watchlists, enquiries, viewing requests, sold) looks exactly like it needs
Plan 27's full analytics event pipeline — which is Phase 6, much later.
Plans 13 §8 and 16 §8 explicitly deferred "recording impression/click
analytics events" to Plan 27.

Resolving this the same way Plan 11 §6 and Plan 17 §3 already resolved an
identical tension for their own core-feature needs: **this plan builds
its own minimal, purpose-built counters** — matching
`idea/low_cost_tech_stack_3_environments.md` §22's simpler
`listing_events`/`listing_metrics_daily` sketch almost exactly — rather
than depending on Plan 27's richer, more general `analytics_events`
system (which is a superset, built later, for deeper BI/personalization
use, per `idea/marketplace_analytics_user_engagement_tracking.md`'s more
elaborate design).

**Amendment to Plan 13 §8 and Plan 16 §8**: their deferral to "Plan 27"
was correct for the *rich* event (with `search_id`, position, surface,
attribution — needed for deep analysis) but this plan needs only a *bare
count* for the seller funnel, which is a much simpler, purpose-specific
mechanism this plan owns directly (§4). The two systems can be unified
later once Plan 27 exists; they don't need to be the same system now.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Impression counting | A lightweight `POST /api/v1/listings/impressions` endpoint accepting a **batched** list of listing IDs (the client batches visible-card impressions every few seconds, not one call per card), incrementing a Redis counter per `listingId`+`date`+`surface`, flushed nightly by a BullMQ job into `ListingMetricsDaily` | Cheap enough to not need Plan 27's full pipeline; batching keeps request volume sane even on a busy Discover feed (Plan 16) or search results page (Plan 13) — a small addition to those already-built plans' front ends, not a rewrite |
| View counting | Extend Plan 17's existing `POST /listings/:id/view` endpoint (already called from Plan 15's detail page) to also increment `Listing.viewCount` | That endpoint already exists for `RecentlyViewed`; `RecentlyViewed`'s upsert semantics (Plan 17 §4) don't preserve a total count, so a simple incrementing counter is the missing piece, added as one more side effect of a call that's already wired up |
| Enquiries / Viewing Requests stages | Sourced from Plan 25 (Messaging) / Plan 26 (Viewing Requests) once those land — **this plan ships the funnel with those stages showing "—" / zero until then**, not blocked on their existence | Phase 5 (Messaging, Viewing Requests) comes right after this plan; rather than sequencing this plan after both, the funnel degrades gracefully, matching the same graceful-degradation pattern used in Plan 20 §3 for AI steps |
| Advert Score composition | Fully **deterministic weighted composite** — Price (from Plan 22's assessment), Photos (Plan 12's coverage), Description/Completeness (Plan 21's completeness score), Engagement (this plan's own funnel conversion rates vs. comparable-set medians), Seller Responsiveness (Plan 25's reply-time stats, "N/A" until Plan 25 lands) | Consistent with every other scoring feature in this project — no AI judgment where a real calculation exists |
| Competitor Intelligence | Reuses **Plan 22's exact comparable-set logic** (same tiered matching, same search-service calls) — this plan does not implement its own comparable-finding algorithm | Avoids two different "find similar listings" implementations disagreeing with each other between the pricing page and the dashboard |

## 4. Data model

```prisma
model ListingMetricsDaily {
  id                   String   @id
  listingId            String   @map("listing_id")
  date                 DateTime @db.Date
  searchImpressions    Int      @default(0) @map("search_impressions")
  feedImpressions      Int      @default(0) @map("feed_impressions")
  views                Int      @default(0)
  likes                Int      @default(0)
  watchlists           Int      @default(0)
  messages             Int      @default(0)      // populated once Plan 25 exists
  viewingRequests       Int     @default(0) @map("viewing_requests") // Plan 26

  @@unique([listingId, date])
  @@map("listing_metrics_daily")
}

model MarketSnapshotDaily {
  id               String   @id
  derivativeId     String   @map("derivative_id")
  date             DateTime @db.Date
  liveListingCount Int      @map("live_listing_count")
  medianPricePence Int      @map("median_price_pence")

  @@unique([derivativeId, date])
  @@map("market_snapshots_daily")
}
```

```prisma
// extends Plan 11's Listing
model Listing {
  // ...existing fields
  viewCount Int @default(0) @map("view_count")
}
```

One nightly BullMQ job (reusing the Plan 05/12 worker) does two things in
one pass: flushes the Redis impression counters into
`ListingMetricsDaily`, and snapshots each derivative's live comparable
count/median price into `MarketSnapshotDaily` — this is also what makes
"3 competing cars disappeared this week" / "median price decreased £275"
(functions doc §23) computable, as a simple day-over-day diff.

## 5. Funnel & dashboard API

```text
GET /api/v1/listings/:id/funnel?range=24h|7d|30d|lifetime
  → { searchImpressions, feedImpressions, views, likes, watchlists,
      messages, viewingRequests, sold: boolean, timeline: [...] }
  → sourced from ListingMetricsDaily + Like/Watchlist counts + Plan 25/26
    once available

GET /api/v1/listings/:id/advert-score
  → { total, breakdown: { price, photos, description, completeness,
      engagement, sellerResponsiveness } }

GET /api/v1/listings/:id/competitor-intelligence
  → { comparableCount, priceRank, mileageRank, specificationPercentile,
      marketMovements: { pricesReducedCount, listingsRemovedCount,
      medianPriceChangePence } }
  → built entirely from Plan 22's comparable-set query + MarketSnapshotDaily diffs
```

## 6. AI Seller Coach

```text
GET /api/v1/listings/:id/coach
  → Claude call (same provider/setup as Plan 14/15/21), given ONLY the
    already-computed real numbers from §5 as context — funnel figures,
    advert score breakdown, comparable-set benchmarks
  → { diagnosis: string, recommendations: [{ text, actionType, actionTarget }] }
```

Following the now-familiar two-phase pattern: **our code computes every
number first** (funnel, score, benchmarks); the AI's only job is
diagnosing and prioritizing in natural language from that real data —
never inventing a statistic itself. Each recommendation carries a machine-
readable `actionType` (e.g. `CHANGE_COVER_PHOTO`, `REVIEW_PRICE`,
`ADD_PHOTOS`, `IMPROVE_DESCRIPTION`) mapped to the **actual existing
endpoint** that action triggers (Plan 21's cover-photo/regenerate
endpoints, Plan 22's price simulator, Plan 12's photo upload) — so a
recommendation is always a real, clickable action, not just advice text.

## 7. Out of scope for this plan

- The rich, general-purpose `analytics_events` pipeline → **Plan 27**
  (this plan's counters are intentionally simpler and separate, per §2)
- Sale-probability prediction → **Plan 22** already deferred this per the
  idea doc's own gate; not revisited here
- Actual messaging/viewing-request features → **Plan 25**/**Plan 26**
  (this plan only has a slot ready for their data)
- Dealer-scale, multi-listing performance rollups → **Plan 33**

## 8. Acceptance criteria

- [ ] The impression-batching endpoint correctly increments Redis
      counters and the nightly job flushes them into
      `ListingMetricsDaily` accurately against a fixture batch.
- [ ] The funnel endpoint reproduces the mockup's own worked example
      shape (impressions → views → likes → watchlists → enquiries →
      viewing requests) against equivalent fixture data.
- [ ] Every Advert Score sub-score is independently verifiable — e.g.
      changing a fixture listing's photo coverage changes only the Photos
      sub-score, not others.
- [ ] The AI Coach's diagnosis text never states a number that doesn't
      match the real computed funnel/score data it was given (same
      hallucination test pattern as Plans 14/15/18/21).
- [ ] Each Coach recommendation's `actionType` maps to a real, working
      endpoint.
- [ ] Competitor Intelligence's comparable count matches what Plan 22's
      price-assessment endpoint reports for the same listing (same
      underlying query, not a diverging count).
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm the impression-counting approach in §3/§4 — comfortable with
   this plan owning a simpler, separate counter system now rather than
   waiting for Plan 27's richer pipeline?
2. Confirm shipping the funnel with Enquiries/Viewing Requests as
   placeholder zeros until Plan 25/26 land, rather than sequencing this
   plan after both.
3. Any specific weighting you want for the Advert Score sub-scores
   (§3), or is an even/reasonable default fine to start with?
