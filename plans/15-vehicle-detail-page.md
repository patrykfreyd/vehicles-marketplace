# Plan 15 — Vehicle Detail Page (Web + Mobile)

Status: Draft
Depends on: Plan 11 (Vehicle/Listing/history data), Plan 08 (catalogue
spec data), Plan 12 (photo variants), Plan 13 (Similar Cars reuses the
search service), Plan 04 (design system, the shared photo viewer this
plan builds)
Blocks: Plan 16 (Discover feed opens into this same page and reuses the
photo-viewer component this plan builds), Plan 17 (Like/Watch actions live
on this page), Plan 18 (Compare reads the same spec data), Plan 22
(properly replaces this plan's placeholder price-banding calculation —
see §5)

## 1. Objective

Build the single **Vehicle Detail** page template (pages doc's explicit
guidance: one template, tab-based sections, not 12 separate pages) for
both web and mobile: the Exterior/Interior photo experience, full
specification/equipment/performance/history tabs, price intelligence and
price history, the AI vehicle summary, "Ask AI about this car," and
Similar Cars — matching `idea/vehicle_marketplace_web_mobile_functions.md`
§8–15.

"Done" means: opening a listing shows real data end to end (photos,
spec, price history, an AI-generated summary that's grounded in that
specific listing's actual fields), the buyer can ask the AI a question and
get an answer that never states something untrue about *this* car, and
the same aggregated data renders correctly through both `ui-web` and
`ui-mobile`.

## 2. Decisions carried over from the functions doc

- Exterior/Interior galleries are separate, directly swipeable/clickable
  sequences with **independently remembered positions** ("Exterior 7/18 →
  Interior 3/12 → Exterior returns to 7/18") — no gallery-opening step
  required for normal browsing.
- Sections: Overview, Specification, Equipment, Performance, Running
  Costs, Dimensions, History, MOT, Price History, Seller — as tabs within
  one page, not separate routes.
- AI summary and "Ask AI about this car" must reason about **the specific
  advertised vehicle**, not just the general model, and must never invent
  condition, equipment, or history it wasn't given.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Shared photo viewer ownership | Built once here as a cross-platform `PhotoViewer` component (`ui-web`/`ui-mobile`), covering Exterior/Interior toggle, independent position memory, and adjacent-image preloading | Plan 16's Discover feed needs the *identical* interaction model in a vertical-feed context — building it once here and having Plan 16 reuse it avoids two subtly different photo-swiping implementations |
| AI summary generation timing | **Generated once, asynchronously, when a listing is published or meaningfully edited** (a BullMQ job, reusing the Plan 12 worker), cached on a `ListingAiSummary` row — not regenerated on every page view | The summary's inputs (spec, condition, price) don't change between views; calling the AI on every page load would be needless latency and cost for content that's effectively static between edits |
| "Ask AI about this car" grounding | Two categories of claim, handled differently: **vehicle-specific facts** (condition, equipment, history, this listing's price) must come *only* from the structured data this plan passes as context, never invented; **general automotive/engineering knowledge** (e.g. "what commonly goes wrong with this engine") may draw on the model's own knowledge, clearly framed as general knowledge, not a claim about this specific car | The functions doc's own example questions include both kinds ("Is this good value?" — vehicle-specific — and "What commonly goes wrong with this engine?" — general knowledge); collapsing them into one grounding rule would either wrongly forbid useful general answers or wrongly allow invented specifics |
| Price intelligence ("Great Price" / market range) | This plan ships a **placeholder** calculation (percentile rank against comparable live listings — same derivative, mileage/year within a band), clearly positioned as provisional | The idea docs' proper pricing algorithm is Plan 22's job (Phase 4, later than this plan). Rather than blocking the detail page on Plan 22, or building the real algorithm twice, this plan ships something honest and functional now that Plan 22 replaces outright — the UI slot and response shape are designed so that swap requires no front-end change |
| MOT/mileage history | Add a **DVSA MOT History API** integration (separate government API from Plan 10's DVLA VES), fetched and cached at publish time, refreshed periodically | Free, and it's the only realistic source of genuine odometer-reading history (each MOT test records mileage) — a real, low-cost anti-clocking signal the idea docs list as desirable ("mileage history") that DVLA VES alone can't provide |

Outstanding finance checks, stolen-vehicle checks, and VIN verification
beyond DVLA/DVSA's free data explicitly stay **out of scope** here — those
need a paid third-party data source and are Plan 30's call to make, not
assumed by this plan.

## 4. Data model additions

```prisma
model ListingAiSummary {
  id         String   @id
  listingId  String   @unique @map("listing_id")
  listing    Listing  @relation(fields: [listingId], references: [id])
  summary    String   @db.Text
  generatedAt DateTime @default(now()) @map("generated_at")

  @@map("listing_ai_summaries")
}

model VehicleMotHistory {
  id            String   @id
  vehicleId     String   @map("vehicle_id")
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id])
  testDate      DateTime @map("test_date")
  result        String                  // PASS | FAIL, per DVSA's own values
  odometerValue Int?     @map("odometer_value")
  odometerUnit  String?  @map("odometer_unit")
  advisories    String[] @default([])
  fetchedAt     DateTime @default(now()) @map("fetched_at")

  @@index([vehicleId])
  @@map("vehicle_mot_history")
}
```

`DvsaMotClient` follows the exact same abstraction pattern as Plan 10's
`DvlaClient` — a real HTTP implementation plus a fixture-returning fake
for Local/Test, so development doesn't depend on live government data.

## 5. Price assessment (placeholder, superseded by Plan 22)

```ts
export const PriceAssessmentSchema = z.object({
  assessment: z.enum(["GREAT_PRICE", "GOOD_PRICE", "FAIR_PRICE", "HIGH_PRICE"]),
  marketRangeLowPence: z.number().int(),
  marketRangeHighPence: z.number().int(),
});
```

V1 calculation: rank the listing's price against `LIVE`/`RESERVED`
listings sharing the same `derivativeId` within a mileage/year tolerance;
percentile below the 25th → `GREAT_PRICE`, etc. This deliberately mirrors
the mockups' own "£1,020 below estimated market value" framing without
claiming a sophistication this plan doesn't build — Plan 22 is explicitly
where a proper comparable-based valuation model replaces this.

## 6. Aggregated detail endpoint

```text
GET /api/v1/listings/:id/detail
  → { listing, vehicle, derivative, generation, model, make, media[],
      equipment[], modifications[], priceHistory[], priceAssessment,
      motHistory[], sellerSummary, aiSummary }
```

One aggregated call for the content-heavy page, rather than the six-plus
round trips a naive implementation would make — cached server-side in
Redis with a short TTL (60s) since the underlying data changes
infrequently relative to how often a popular listing is viewed.

```text
POST /api/v1/listings/:id/ask-ai
  body: { question }
  → { answer }
```

A separate, uncached, interactive endpoint (mirrors Plan 14's chat
pattern) — given the structured context object from `GET .../detail` plus
the buyer's question, following §3's two-category grounding rule. Rate-
limited per user (proposed: 30 questions/hour per listing) since, like
Plan 14, every call costs real money.

## 7. Web vs. mobile rendering

One shared `VehicleDetailResponse` type (inferred from the schemas above),
rendered through platform-specific layouts:

- **Web**: sidebar spec/price panel alongside the photo viewer, keyboard
  arrow-key photo navigation, tabs as inline sections.
- **Mobile**: full-width photo viewer at the top, tabs as a scrollable
  sub-navigation beneath it, per the mockups.

Both consume the identical API response — the platform difference is
layout only, not data shape.

## 8. Similar Cars

A thin wrapper around Plan 13's search service (same `generationId`,
price within a tolerance band, excluding the current listing) — not a new
ranking algorithm. `GET /api/v1/listings/:id/similar` internally calls the
same search service Plan 13 already built.

## 9. Out of scope for this plan

- Like/Watch/Collections actions (buttons appear on this page but the
  underlying feature) → **Plan 17**
- Full side-by-side Compare experience → **Plan 18**
- Proper market-valuation algorithm → **Plan 22** (this plan's §5 is
  explicitly a placeholder)
- Outstanding finance / stolen / VIN-verification checks → **Plan 30**
- Recording `LISTING_VIEW`/photo-engagement analytics events → **Plan 27**
  (this page is where those events *fire from*, but this plan doesn't
  build the event pipeline itself)
- Dealer-specific profile richness (stock feed, dealer dashboard) →
  **Plan 33/34** (this plan shows only a summary card)

## 10. Acceptance criteria

- [ ] The photo viewer correctly remembers independent Exterior/Interior
      positions across toggling, on both web and mobile, using the
      variants produced by Plan 12.
- [ ] `GET /listings/:id/detail` returns one aggregated response covering
      every section listed in §2, cached for 60s.
- [ ] A listing's AI summary is generated once at publish time (verified:
      editing the listing's price doesn't regenerate it unless the edit
      is meaningful per the trigger rule; editing the description does).
- [ ] Asking "what commonly goes wrong with this engine?" produces an
      answer framed as general knowledge; asking "does it have full
      service history?" produces an answer strictly grounded in this
      vehicle's actual `serviceHistoryType` field, never guessed.
- [ ] `VehicleMotHistory` correctly reflects a fixture DVSA response,
      including odometer readings usable for a basic mileage-consistency
      check.
- [ ] The price assessment matches the expected band for a fixture set of
      comparable listings (e.g. a listing at the 10th percentile shows
      `GREAT_PRICE`).
- [ ] Similar Cars excludes the current listing and returns only
      `LIVE`/`RESERVED` results from the same generation.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 11. Open questions for you

1. Confirm adding the DVSA MOT History integration now (§3) — it's a
   second government API registration alongside Plan 10's DVLA VES; worth
   it for the mileage-history value, or would you rather defer it?
2. Confirm the placeholder price-banding approach in §5 — comfortable
   shipping something visibly "good enough for now" that Plan 22 later
   replaces, rather than delaying this whole page until Plan 22 exists?
3. Confirm the proposed 30 questions/hour per-listing "Ask AI" rate limit.
