# Plan 27 — Analytics Event Pipeline

Status: Draft
Depends on: Plan 03 (event-naming convention already fixed —
`UPPER_SNAKE_CASE`), Plan 05 (ingestion endpoint), Plan 06 (Postgres)
Blocks: Plan 28 (Aggregation & Admin Reporting consumes the raw
`analytics_events` this plan produces), Plan 29 (Personalization derives
interest signals from this data)

## 1. Objective

Build the raw event-capture pipeline from
`idea/marketplace_analytics_user_engagement_tracking.md`: the
`analytics_events` table, a shared event-name package, a batched
ingestion endpoint, anonymous→registered identity stitching, and first-
touch/current-touch attribution — then go back through every prior plan
that deferred "recording an event" to this one and actually add the
tracking calls (§6). This plan is both new infrastructure **and** a
retrofit across roughly a dozen already-built features.

"Done" means: a real user journey (anonymous search → registration →
listing view → watchlist → message) produces a correctly-ordered,
correctly-attributed sequence of rows in `analytics_events`, with the
anonymous and registered portions of that journey joinable together
without ever having rewritten a historical event.

## 2. Decisions carried over from the analytics doc

- Capture meaningful raw events now; metrics/scoring models can change
  later, but behavior never recorded can't be reconstructed.
- Store both **first-touch** (never overwritten) and **current/session**
  attribution — not one or the other.
- Important dimensions are real indexed columns; secondary detail lives in
  `properties JSONB` (§34 of the analytics doc) — not everything crammed
  into JSONB.
- Consistent `UPPER_SNAKE_CASE` event names from one shared package —
  already the rule since Plan 03 §3, restated here because this is the
  plan where it actually gets enforced across every event.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Identity stitching mechanism | **Never mutate historical events.** Record an `AnonymousIdentityLink { anonymousId, userId, linkedAt }` row at registration/login; reconstruct a full anonymous→registered journey at **query time** by joining through this link table | `analytics_events` should be a true append-only log — event-sourcing best practice, and mutating potentially millions of historical rows on every registration would be both slow and a bad precedent. The link table gets the same analytical result without ever rewriting history |
| `properties` validation | Indexed columns (§34's list) are strictly validated per Plan 03's schema conventions; `properties` is a size-capped, loosely-typed JSONB blob — **not** deeply schema-validated per individual event type in V1 | Fully typing every event's `properties` shape now would mean maintaining ~40 separate schemas for a system this plan is still bootstrapping; the indexed columns already carry everything that needs to be reliably queryable |
| Ingestion batching | Client batches events (flushed every few seconds or on a size threshold) into one `POST /analytics/events` call, mirroring the batching pattern already used for impressions in Plan 23 | One HTTP request per user click would be wasteful at this event volume; consistent with how Plan 23 already solved the identical problem for impressions |
| Consent gating | A basic consent-state check (Plan 04's component conventions) gates only **marketing-attribution** fields (UTM/campaign/referrer capture) — core anonymous product-usage events proceed without a blocking consent prompt | This is a genuine legal question (UK PECR/GDPR), not a purely technical one — this plan implements the technical gating mechanism, but the actual consent-bar placement needs real legal sign-off, flagged explicitly in open question 1 rather than asserted as settled here |
| Relationship to Plan 23's counters | **Kept permanently separate**, not migrated into this pipeline | Plan 23 §2 already made this call deliberately — its `ListingMetricsDaily` is a simpler, purpose-built system for the seller funnel; this plan's `analytics_events` is the broader BI/personalization dataset. Unifying them later is possible but not required, and forcing it now would mean reopening a plan that's already shipped |
| Raw event retention | Proposed default: **24 months** raw retention, aggregated-only beyond that | A reasonable default balancing "don't lose data we might need" against "don't keep an unbounded, ever-growing table forever" — flagged as open question 2 since retention is ultimately a compliance/business decision, not a technical one |

## 4. Data model

```prisma
model AnalyticsEvent {
  id            String   @id
  eventName     String   @map("event_name")   // validated against the shared enum in packages/analytics-types
  occurredAt    DateTime @map("occurred_at")

  anonymousId   String?  @map("anonymous_id")
  sessionId     String   @map("session_id")
  userId        String?  @map("user_id")

  listingId     String?  @map("listing_id")
  vehicleId     String?  @map("vehicle_id")
  derivativeId  String?  @map("derivative_id")
  generationId  String?  @map("generation_id")
  modelId       String?  @map("model_id")
  makeId        String?  @map("make_id")

  searchId          String? @map("search_id")
  recommendationId  String? @map("recommendation_id")

  source    String?
  medium    String?
  campaign  String?

  platform    String?   // "web" | "mobile"
  deviceType  String?   @map("device_type")

  properties Json?

  @@index([eventName, occurredAt])
  @@index([userId])
  @@index([anonymousId])
  @@index([listingId])
  @@index([searchId])
  @@map("analytics_events")
}

model AnonymousIdentityLink {
  id          String   @id
  anonymousId String   @map("anonymous_id")
  userId      String   @map("user_id")
  linkedAt    DateTime @default(now()) @map("linked_at")

  @@unique([anonymousId, userId])
  @@map("anonymous_identity_links")
}

model UserAcquisition {
  id                  String   @id
  userId              String?  @unique @map("user_id")       // set once a user registers
  anonymousId         String?  @unique @map("anonymous_id")  // set for pre-registration tracking
  firstTouchSource    String?  @map("first_touch_source")
  firstTouchMedium    String?  @map("first_touch_medium")
  firstTouchCampaign  String?  @map("first_touch_campaign")
  firstSeenAt         DateTime @default(now()) @map("first_seen_at")

  @@map("user_acquisitions")
}
```

`UserAcquisition` is written **once** and never overwritten after — this
is the concrete mechanism behind the analytics doc §5's explicit rule
("do not overwrite the original acquisition source every time the user
returns"), while every individual `AnalyticsEvent.source/medium/campaign`
continues to represent that specific event's current-touch context.

## 5. Event catalog (`packages/analytics-types`)

Ports the analytics doc §44 "what to track from day one" list directly
into a shared TypeScript union, `UPPER_SNAKE_CASE`, one canonical name per
concept (`LISTING_VIEW`, never `listingOpened`/`view-car`/etc. — the exact
drift the analytics doc warns against). The full list is reproduced from
that section verbatim as this package's initial content; not repeated
here in full to avoid two sources of truth for the same list.

## 6. Instrumentation checklist — adding tracking calls to already-built features

This is the concrete, non-infrastructure half of this plan's work: going
back through prior plans that explicitly deferred event-recording here,
and adding the actual client-side `track(eventName, properties)` calls.

| Source plan | Events to add |
|---|---|
| Plan 13 (Search) | `SEARCH_PERFORMED`, `SEARCH_ZERO_RESULTS`, `SEARCH_RESULT_CLICKED` — keyed by the `searchId` Plan 13 already mints |
| Plan 14 (AI Search) | `AI_SEARCH_STARTED`/`COMPLETED`/`FAILED`, plus the latency/token/cost operational data Plan 14 §8 already structures for this purpose |
| Plan 15 (Detail page) | `LISTING_VIEW`, `PHOTO_EXTERIOR_VIEW`, `PHOTO_INTERIOR_VIEW`, `SPECIFICATIONS_VIEWED`, `HISTORY_VIEWED` |
| Plan 16 (Discover) | `DISCOVER_SESSION_STARTED`/`ENDED`, `CAR_IMPRESSION`, `CAR_SKIPPED` |
| Plan 17 (Saved) | `LIKE`, `WATCHLIST_ADD`, `SEARCH_SAVED` |
| Plan 18 (Compare) | `COMPARE_ADD`, `COMPARE_VIEW` |
| Plan 19 (Research/SEO) | Page-type + catalogue-ID `PAGE_VIEW` events, using the metadata Plan 19 §7 already renders on each page |
| Plan 20 (Advert Wizard) | `SELL_STARTED`, `REGISTRATION_LOOKUP`, `VEHICLE_CONFIRMED`, `ADVERT_STEP_STARTED`/`COMPLETED`/`ABANDONED`, `ADVERT_PUBLISHED` |
| Plan 21 (AI Advert) | `AI_ADVERT_GENERATED`, `AI_ADVERT_ACCEPTED`, `AI_ADVERT_REGENERATED` |
| Plan 25 (Messaging) | `MESSAGE_STARTED` |
| Plan 26 (Viewing/Offers) | `VIEWING_REQUESTED` (the **analytics event**, distinct from Plan 24's `NotificationType.VIEWING_REQUESTED` — same name, different purpose: one records for analysis, the other triggers an alert; both can coexist without conflict) |

Each addition is a small, additive change to an already-shipped plan's
front-end code (a `track()` call at the point the action already happens)
— none of it requires reopening those plans' backend logic.

## 7. Out of scope for this plan

- Daily aggregation, `listing_metrics_daily`-style rollups for BI
  reporting, and the admin analytics dashboard → **Plan 28**
- Personalization/recommendation use of this data → **Plan 29**
- Plan 23's separate seller-funnel counters → intentionally not touched,
  per §3
- Per-event-type deep schema validation of `properties` → deferred,
  revisit only if data quality issues actually emerge

## 8. Acceptance criteria

- [ ] A simulated anonymous session (search, view two listings) followed
      by registration and a watchlist action produces correctly ordered
      `analytics_events`, joinable end-to-end via `AnonymousIdentityLink`
      without any historical row being rewritten.
- [ ] `UserAcquisition.firstTouchSource` set on first visit is unchanged
      after a later visit with different UTM parameters, while
      individual events from that later visit still carry the new
      source/medium/campaign correctly.
- [ ] The batched ingestion endpoint correctly inserts all events from a
      single batched client payload.
- [ ] Every event name sent by the client validates against the shared
      `packages/analytics-types` enum — an unrecognized event name is
      rejected, not silently accepted.
- [ ] At least the Plan 13/15/17 tracking calls from §6 are verified
      firing correctly end to end against real user actions (proving the
      instrumentation pattern works before rolling it out to the rest of
      the checklist).
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. The consent-gating approach in §3 is a real legal question, not just a
   technical one — do you have (or need) legal guidance on exactly which
   tracking requires explicit consent under UK PECR/GDPR before this
   ships?
2. Confirm the proposed 24-month raw retention default, or do you have a
   different requirement (regulatory or otherwise)?
3. Given §6's list is large, would you like this plan scoped to just the
   pipeline + a handful of proof-of-concept integrations (as the
   acceptance criteria currently propose), with the remaining
   instrumentation rolled out incrementally afterward rather than all at
   once?
