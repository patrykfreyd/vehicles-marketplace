# Plan 16 — Mobile Discover Feed

Status: Draft
Depends on: Plan 15 (reuses the shared `PhotoViewer` component and
`PriceAssessmentSchema`), Plan 13 (Nearby/Latest tabs delegate to the
search service), Plan 11 (`Listing` visibility rules), Plan 04 (design
system, gesture/animation primitives)
Blocks: Plan 17 extends the minimal Like/Watchlist tables this plan
creates with Collections and the dedicated Saved screens; Plan 29
(Personalization, Phase 6) replaces this plan's placeholder "For You"
ranking with a learned one

## 1. Objective

Build the Instagram/Reels-style full-screen Discover feed —
`idea/vehicle_marketplace_web_mobile_functions.md` §1–3: vertical swipe
between cars, horizontal swipe between photos of the same car, instant
Exterior/Interior toggle, and the For You / Nearby / Latest / Price Drops
tabs — reusing Plan 15's photo-viewer component in a vertical-feed
context rather than rebuilding photo browsing from scratch.

"Done" means: swiping through a real, mixed set of listings feels smooth
(no dropped frames, no visible image pop-in) on a mid-range device, photo
browsing within a card works identically to the Vehicle Detail page, and
Like/Watch actions on a card persist and are reflected correctly if the
buyer later opens Saved (Plan 17).

## 2. Decisions carried over from the functions doc

- Gestures: **swipe up/down → next/previous car**, **swipe left/right →
  next/previous photo of the current car**, **tap Exterior/Interior →
  instant switch**, **pinch → zoom** — no gallery-opening step for normal
  browsing.
- Tabs: **For You, Nearby, Latest, Price Drops, Following**.
- Users should not have to open a gallery to browse photographs — photos
  move directly from the main card view, matching Plan 15's photo viewer
  exactly.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Vertical paging mechanism | **FlashList** (per the stack doc) configured for vertical paging — `snapToInterval` set to screen height, `decelerationRate="fast"`, `disableIntervalMomentum` | This is the standard, well-understood React Native pattern for a TikTok/Reels-style feed; FlashList's recycling keeps memory bounded even over a long scroll session |
| Image component/caching | **`expo-image`** instead of RN's built-in `Image` | Built-in disk/memory caching and an explicit `prefetch` API — needed to implement "preload ahead/behind" (§4) without hand-rolling a cache |
| "For You" ranking for V1 | A **placeholder heuristic**: recency-weighted with a simple diversity rule (never show two listings of the same derivative back-to-back within the visible window) — not a learned model | Full personalization (interest profiles, learned ranking) is Plan 29's job, much later (Phase 6). Shipping Discover now with an honest, reasonable heuristic — rather than waiting for Plan 29 to exist — matches this project's repeated pattern of shipping a working placeholder that a later, deeper plan replaces (see Plan 15 §5 for the same pattern applied to pricing) |
| Like/Watchlist ownership | This plan creates the **minimal** `Like`/`Watchlist` tables and toggle endpoints — just enough for the feed's heart/bookmark buttons to work; Plan 17 extends this with Collections, Saved Searches, and the dedicated Saved/Watchlist list screens | The feed can't ship without a working Like/Watch action, but building the *full* Saved experience here would duplicate what Plan 17 (next in sequence) is explicitly scoped to own |
| "Following" tab | **Deferred** — no plan in this index currently owns a follow-dealer/follow-make/follow-model relationship (functions doc §30 lists it, but it isn't assigned anywhere). Ship V1 with four tabs (For You, Nearby, Latest, Price Drops); add Following once that relationship exists | Flagging this as a genuine gap rather than silently building a partial version of it or silently dropping it — see open question 3 |
| Image preload window | Prefetch only the **current card + one ahead + one behind** (thumbnail/medium variants, never originals per Plan 12 §2) | An infinite feed with unbounded prefetching would grow memory without bound; a tight window matches how the user actually experiences the feed (they're never looking at more than one card at a time) |

## 4. Feed API (`apps/api/src/modules/discover`)

Not a single pass-through to Plan 13's search — each tab has different
semantics, some delegating, some bespoke:

```text
GET /api/v1/discover/feed?tab=FOR_YOU|NEARBY|LATEST|PRICE_DROPS&cursor=...
```

```text
NEARBY        → delegates to Plan 13's search service, sort=DISTANCE_ASC
LATEST        → delegates to Plan 13's search service, sort=NEWEST
PRICE_DROPS   → bespoke query: listings with a ListingPriceHistory
                decrease within the last 14 days, sorted by drop size,
                then recency
FOR_YOU       → bespoke query per §3's placeholder heuristic: recent
                listings with the same-derivative diversity rule applied
                in application code (not expressible as a single SQL
                ORDER BY) after fetching a candidate page
```

Response items are the same `SearchResultSchema` shape from Plan 13 —
this plan doesn't invent a parallel card data shape.

## 5. Like / Watchlist (minimal, extended by Plan 17)

```prisma
model Like {
  id        String   @id
  userId    String   @map("user_id")
  listingId String   @map("listing_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, listingId])
  @@map("likes")
}

model Watchlist {
  id        String   @id
  userId    String   @map("user_id")
  listingId String   @map("listing_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, listingId])
  @@map("watchlists")
}
```

```text
POST/DELETE /api/v1/listings/:id/like
POST/DELETE /api/v1/listings/:id/watch
```

Toggle semantics (idempotent `POST` = ensure liked, `DELETE` = ensure
not) — both require authentication (Plan 07), neither requires verified
email (liking/watching is exactly the low-friction browsing behavior
Plan 07 §3 deliberately keeps open).

## 6. Card composition & interaction

Each feed card renders Plan 15's `PhotoViewer` component (Exterior/
Interior toggle, independent position memory — reused verbatim, not
reimplemented) plus an info overlay: price, price-rating badge (Plan 15's
`PriceAssessmentSchema`), make/model/derivative, year, mileage, distance,
seller type, and the Like/Watch buttons from §5.

Deliberately **not** included: a finance-payment estimate — that implies
a loan/APR calculator feature not scoped in any current plan (the
mockups mention it, but no plan owns the underlying calculation). Flagged
as a gap in the open questions rather than silently built or dropped.

Vertical swipe transitions and the Like-button animation use Reanimated +
Gesture Handler (already in the stack); the horizontal photo swipe within
a card is Plan 15's existing gesture handling, not re-implemented.

## 7. Performance considerations

- FlashList `estimatedItemSize` tuned to the card height; only current ±1
  cards' images are prefetched (§3).
- Cards outside the recycling window unmount their photo viewer state
  entirely — no background video/heavy processing for off-screen cards.
- The feed's own scroll/swipe performance is validated against a
  mid-range Android device, not just a simulator, before this plan is
  considered done (simulators routinely hide jank that real mid-range
  hardware exposes).

## 8. Out of scope for this plan

- Collections, Saved Searches, and the dedicated Watchlist/Likes list
  screens → **Plan 17** (this plan only creates the tables/toggle
  endpoints those screens will read)
- Learned "For You" personalization → **Plan 29**
- The "Following" tab and any follow-relationship data model → currently
  unowned; see open question 3
- Finance/payment estimate calculation → currently unowned; see open
  question 2
- `DISCOVER_SESSION_STARTED`/`CAR_IMPRESSION`/`CAR_SKIPPED` analytics
  event recording → **Plan 27** (this plan fires the client-side signal;
  Plan 27 owns the ingestion pipeline)

## 9. Acceptance criteria

- [ ] Swiping vertically through at least 30 real fixture listings shows
      no dropped frames or visible image pop-in on a mid-range Android
      device.
- [ ] Toggling Exterior/Interior and swiping through photos within a card
      behaves identically to Plan 15's Vehicle Detail page (same
      component, verified by shared component tests, not duplicated
      assertions).
- [ ] The For You tab never shows two consecutive cards of the same
      `derivativeId` when at least two different derivatives exist in the
      candidate set.
- [ ] Price Drops correctly surfaces a fixture listing with a recent price
      decrease, sorted appropriately against other price-dropped
      listings.
- [ ] Liking a card in the feed and then opening the (Plan 17-built)
      Saved screen shows that same listing — proving the shared
      underlying table, not a feed-local state.
- [ ] Memory usage stays bounded over a long scroll session (verified by
      not growing unboundedly across, e.g., 200 consecutive card swipes).
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm shipping "For You" with the recency+diversity placeholder
   (§3) now, rather than waiting for Plan 29's real personalization to
   exist before Discover launches at all.
2. The finance-payment estimate shown in the mockups isn't owned by any
   current plan — worth adding as its own small future plan, or should it
   be dropped from the product for now?
3. Same question for the "Following" tab (follow dealer/make/model) —
   worth a dedicated future plan, fold into Plan 17 or Plan 33, or drop
   for V1?
