# Plan 22 — Pricing Intelligence & Market Valuation

Status: Draft
Depends on: Plan 11 (`Listing`/`ListingPriceHistory`), Plan 08
(`Derivative` for comparability), Plan 13 (comparable-listing lookups
reuse the search service, not a new query engine), Plan 15 (this plan
**replaces** the placeholder valuation from Plan 15 §5, keeping its
response contract), Plan 20 (wizard's Price step calls this plan)
Blocks: Plan 23 (Seller Competitor Intelligence ranks a seller's listing
among the comparable set this plan defines — Plan 23 doesn't rebuild
comparable-matching, it reuses this plan's)

## 1. Objective

Replace Plan 15 §5's honest placeholder with the real comparable-based
valuation engine: finding genuinely comparable listings, computing a
transparent market-price band, and a deterministic what-if price
simulator for the seller wizard. This plan keeps `PriceAssessmentSchema`'s
existing shape (extended, not replaced) so Plan 15's and Plan 20's callers
need no changes when this plan lands.

"Done" means: a listing's price assessment is computed from real
comparable listings with a stated comparability tier and sample size (never
a falsely confident band from too little data), a seller can simulate a
different price in the wizard and immediately see the updated assessment,
and — per the idea doc's own explicit caution — this plan does **not**
attempt sale-probability prediction, which the functions doc itself says
should wait until real transaction data exists.

## 2. Decisions carried over from the idea docs

- Price assessment shown as a band ("Great Price," market range) with a
  stated basis ("based on comparable vehicles," "£1,020 below estimated
  market value").
- **Predicted-sale-likelihood modeling is explicitly deferred**
  (functions doc §24: "This should only launch once enough real
  performance/transaction data exists to make predictions meaningful") —
  this plan does not build it, and "what-if pricing simulator" in this
  plan's scope means the deterministic band recompute below, not an ML
  sale-probability estimate.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Comparable data source | Live/reserved **asking** prices, plus a newly-captured **confirmed sold price** where available (see §4) — not asking price alone | Asking price is a supply-side signal, not a clearing price; a genuine valuation should weight actual sale outcomes more heavily once enough exist. This plan adds the cheap capture mechanism now so that data starts accumulating from day one, even though V1 will initially have few confirmed sales to weight |
| Comparability broadening | Tiered: try **same derivative** first; if fewer than 5 comparables, broaden to **same generation**; if still fewer than 5, **same model** — the response always states which tier was used | Silently diluting to "same model" without saying so would make a G82 M4's valuation look precisely researched when it's actually based on loosely related cars — transparency about the tier is the honest alternative |
| Valuation method | Simple **percentile bands over the comparable set** (optionally filtered to ±15% mileage / ±1 year), not a mileage/age depreciation regression model | Consistent with this project's repeated preference for the simplest approach that's honestly good enough — a depreciation curve model is a real future improvement, not a V1 requirement, and is easy to introduce later without changing the response contract |
| Banding thresholds | `<25th percentile → GREAT_PRICE`, `25–50th → GOOD_PRICE`, `50–75th → FAIR_PRICE`, `>75th → HIGH_PRICE` | Matches the mockups' own visible badges directly |
| "AI Price Recommendation" | The **recommended number is deterministic** (the comparable set's median), **not** a separate LLM call — an *optional* short grounded one-line explanation ("Similar M4 Competition xDrives are selling between £X and £Y") can use Plan 14's Phase-3 pattern, citing only the real comparable count/range | Same recurring insight as Plan 18's superlative badges: what's labeled "AI" in the product copy is, at its core, a number that should never be left to a model to guess when it can be computed exactly |
| Insufficient data | Below a **minimum sample size (3)**, even after broadening to model-level, return an explicit `INSUFFICIENT_DATA` state — never a band computed from 1–2 comparables presented with the same confidence as one from 20 | A confident-looking "Great Price" badge built on two data points is actively misleading — better to say plainly there isn't enough market data yet |

## 4. Data model addition

```prisma
// extends Plan 11's Listing, captured optionally at the LIVE/RESERVED → SOLD transition
model Listing {
  // ...existing fields
  soldPricePence Int? @map("sold_price_pence")
}
```

Plan 11 §7's status-transition endpoint gets a small extension: moving to
`SOLD` accepts an optional `soldPricePence` ("What did it sell for?" —
skippable, never required) rather than this plan inventing a separate
capture flow. Small, cheap, and the only realistic way this marketplace
ever accumulates genuine clearing-price data instead of staying
permanently reliant on asking prices.

## 5. `PriceAssessmentSchema` — extended, not replaced

```ts
export const PriceAssessmentSchema = z.object({
  assessment: z.enum(["GREAT_PRICE", "GOOD_PRICE", "FAIR_PRICE", "HIGH_PRICE", "INSUFFICIENT_DATA"]),
  marketRangeLowPence: z.number().int().optional(),   // absent when INSUFFICIENT_DATA
  marketRangeHighPence: z.number().int().optional(),
  comparableCount: z.number().int(),
  comparabilityTier: z.enum(["EXACT_DERIVATIVE", "SAME_GENERATION", "SAME_MODEL"]).optional(),
});
```

Existing callers (Plan 15's detail page, Plan 20's wizard) already handle
this shape structurally — the new fields are additive, and
`INSUFFICIENT_DATA` is simply one more enum value a UI built to Plan 15's
original contract needs to render a message for, not a breaking change.

## 6. API

```text
GET /api/v1/listings/:id/price-assessment
  → real comparable-based calculation, replacing Plan 15's placeholder logic
    behind the exact same endpoint

POST /api/v1/vehicles/:id/price-simulate
  body: { candidatePricePence }
  → { assessment: PriceAssessmentSchema, recommendedPricePence }
  → a pure, non-persisting calculation — used by Plan 20's wizard Price
    step to show "if you set £X, here's how it compares" live as the
    seller adjusts a price field
```

Comparable-listing lookups internally call Plan 13's search service with
the appropriate derivative/generation/model filter — this plan does not
maintain a separate query path to the same data.

## 7. Out of scope for this plan

- Sale-probability prediction ("74% chance of selling within 30 days") →
  explicitly deferred per §2, revisit only once real transaction volume
  exists
- Seller Competitor Intelligence display (ranking among comparables,
  "17th cheapest," market movement narration) → **Plan 23**, built on top
  of this plan's comparable-set logic
- Mileage/age depreciation-curve modeling → future refinement, not V1

## 8. Acceptance criteria

- [ ] A fixture derivative with 8 comparable live listings produces a
      percentile band using `EXACT_DERIVATIVE` tier; removing all but 2
      comparables at that tier correctly broadens to `SAME_GENERATION`.
- [ ] Fewer than 3 comparables at every tier returns `INSUFFICIENT_DATA`
      with no market range, never a falsely confident band.
- [ ] `price-simulate` returns an updated assessment without writing
      anything to the database — verified by asserting no `Listing` row
      changes as a result of calling it.
- [ ] Marking a listing `SOLD` with a supplied `soldPricePence` correctly
      persists it; omitting it leaves the field `null` without blocking
      the transition.
- [ ] Plan 15's Vehicle Detail page and Plan 20's wizard both continue to
      work correctly against this plan's response with no front-end
      changes beyond handling the new `INSUFFICIENT_DATA` state.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm extending Plan 11's `SOLD` transition with an optional
   `soldPricePence` capture — a small, real addition to that plan's
   endpoint worth confirming.
2. Confirm the percentile thresholds and minimum-sample-size (3) in §3 —
   tune differently if you have a stronger intuition for this market.
3. Confirm skipping sale-probability prediction entirely for V1, per the
   idea doc's own explicit gate on that feature.
