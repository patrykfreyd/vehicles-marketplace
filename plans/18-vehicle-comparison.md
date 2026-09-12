# Plan 18 — Vehicle Comparison

Status: Draft
Depends on: Plan 15 (spec/price data reused per compared listing), Plan
08 (catalogue spec fields), Plan 11 (vehicle/listing fields), Plan 14 (the
grounding pattern this plan's AI verdict reuses directly), Plan 04
(comparison table/card UI)
Blocks: nothing structurally downstream — a leaf feature

## 1. Objective

Build side-by-side vehicle comparison —
`idea/vehicle_marketplace_web_mobile_functions.md` §15: a full table on
web, a simplified version on mobile, deterministic superlative badges
("Best performance," "Most economical") computed from real data, and one
AI-generated holistic "best overall" verdict, grounded exactly the way
Plan 14/15 already established.

"Done" means: comparing 2–5 real listings shows accurate spec/price/
equipment differences side by side, the deterministic superlative badges
are provably correct against the underlying numbers (not guessed), the AI
"best overall" verdict never references a spec that isn't actually true of
the compared vehicles, and the comparison is shareable via URL on web.

## 2. Decisions carried over from the functions doc

- Compare **up to several** vehicles across price, mileage, age, power,
  torque, 0–60, MPG, tax, insurance, owners, MOT, boot capacity,
  dimensions, equipment, history, market valuation, seller, and distance.
- Web gets the **full, exceptional** comparison experience; mobile gets a
  **simplified** version — explicitly different, not the same table
  shrunk down.
- AI Comparison identifies best value, best performance, best
  specification, most practical, lowest likely running costs, and **best
  overall for the specific user**.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Selection persistence | **Client-side only** (URL query params on web — `/compare?ids=a,b,c` — local state on mobile), not a server-persisted "Compare List" entity | Matches the mockup's own "Share comparison" button, which implies a shareable link, not a saved server resource. A comparison session is transient by nature — Plan 17's Saved/Collections already covers the "I want to keep this for later" need |
| Superlative badges vs. AI verdict | **Split by whether the judgment is objective or subjective.** "Best performance" (lowest 0–60), "Most economical" (best combined MPG), "Lowest mileage," "Best value" (price relative to a spec-weighted score) are all **deterministic min/max computations** over already-fetched real numbers — zero AI involved. Only "**best overall**" is genuinely subjective enough to need an AI pass | This is a meaningful cost/risk reduction over asking AI to judge everything: most of the mockup's "AI verdict" row doesn't actually need AI — it needs correct arithmetic. Keeping those deterministic means they're never wrong and never cost a token |
| "Best overall for the specific user" | AI pass, grounded **only** in the already-fetched comparison data for the selected vehicles (Plan 14's exact Phase-3 pattern: given real data, reason only from it) — with a **generic** weighting for V1, not a personalized-priorities UI | Functions doc explicitly wants this personalized to the user's priorities — but building a priorities UI here would duplicate Plan 14's AI Car Finder, which already exists specifically to capture personal priorities and match against inventory. V1 ships a sensible generic "best overall" here and points buyers wanting a personalized recommendation to Car Finder instead of rebuilding that flow twice |
| Compare limits | **Web: up to 5.** **Mobile: up to 3**, rendered as horizontally-scrollable cards per field section rather than a dense table | Matches the mockup's 4-column web layout with room to grow; mobile's "simplified" instruction is concretely a lower cap plus a fundamentally different (card, not table) layout, not the same table at a smaller font |

## 4. API

```text
GET /api/v1/compare?listingIds=a,b,c
  → { vehicles: CompareVehicleSchema[] }
```

A **dedicated, lighter** response shape than Plan 15's full aggregated
detail endpoint — comparison only needs the fields listed in §2, not the
AI summary, MOT history detail, or price-history array; fetching N
listings' worth of that heavier payload just to show a comparison table
would be wasteful.

```text
POST /api/v1/compare/verdict
  body: { listingIds: string[] }
  → { deterministic: { bestPerformance, mostEconomical, lowestMileage, bestValue },
      bestOverall: { listingId, reasoning } }
```

Deterministic superlatives are computed in this same request (no AI call)
directly from `CompareVehicleSchema` data already fetched; `bestOverall`
is the one field that goes through an AI call, following Plan 14's
grounded-explanation pattern exactly — given only these vehicles' real
data, reasoning about which is "best overall" using a fixed, sensible
generic weighting (price, condition, spec completeness, running cost).

## 5. Equipment comparison

The union of all equipment across the compared vehicles' `VehicleEquipment`
rows (Plan 11), rendered as a checklist with a check/absent mark per
column — a standard "compare features" table, no new equipment concept
needed beyond what Plan 08/11 already model.

## 6. Web vs. mobile rendering

- **Web**: full table, one row per spec field, one column per vehicle
  (up to 5), sticky header row, "Share comparison" copies the current
  URL.
- **Mobile**: capped at 3 vehicles, rendered as swipeable field-section
  cards (e.g. "Performance" card showing all 3 vehicles' power/torque/
  0–60 together, then swipe to the next section) rather than a wide table
  that would require horizontal scrolling on a small screen.

Both consume the identical `CompareVehicleSchema` — the difference is
layout only, matching the pattern already established in Plan 15 §7.

## 7. Out of scope for this plan

- Personalized priority-weighted comparison → direct users to **Plan 14**
  (AI Car Finder) instead, per §3
- Saving a comparison for later (beyond the shareable URL) → would be a
  small addition to **Plan 17** if wanted; not built here (see open
  question 3)
- Recording `COMPARE_ADD`/`COMPARE_VIEW` analytics events → **Plan 27**
  (this plan fires the client-side signal; Plan 27 owns ingestion)

## 8. Acceptance criteria

- [ ] `GET /compare?listingIds=...` returns correct comparison fields for
      2–5 fixture listings, excluding the heavier fields Plan 15's detail
      endpoint includes.
- [ ] Deterministic superlative badges are provably correct against the
      underlying fixture numbers (e.g. the listing with the lowest
      fixture 0–62 time is always flagged "Best performance").
- [ ] The AI "best overall" verdict, tested against a fixture set where
      one vehicle is objectively strongest across every metric, correctly
      picks it, and its reasoning text never references a spec value that
      isn't actually true of the compared vehicles (same hallucination
      test pattern as Plan 14/15).
- [ ] Loading `/compare?ids=a,b,c` directly (simulating a shared link)
      reproduces the exact same comparison a user would reach by adding
      those vehicles manually.
- [ ] The mobile comparison view enforces the 3-vehicle cap and renders
      as field-section cards, not a shrunk copy of the web table.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm the 5 (web) / 3 (mobile) compare limits.
2. Confirm directing personalized "best overall for me" comparisons to
   the existing AI Car Finder (Plan 14) rather than building a second,
   comparison-specific priorities UI.
3. Do you want a "save this comparison" feature (a small persisted
   record, likely folded into Plan 17) in addition to the shareable URL,
   or is the URL sufficient for V1?
