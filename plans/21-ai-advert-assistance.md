# Plan 21 — AI Advert Assistance

Status: Draft
Depends on: Plan 11 (`Vehicle`/`Listing` — the only source of facts the AI
may state), Plan 12 (`Media`, photo classification, the `isCoverPhoto`
field this plan finally adds per Plan 12 §5's explicit handoff), Plan 14
(same grounding pattern, same AI provider setup, reused not re-derived),
Plan 20 (wizard step 4 calls this plan's generate endpoint)
Blocks: nothing structurally downstream

## 1. Objective

Implement the seller-facing AI assistance from
`idea/vehicle_marketplace_web_mobile_functions.md` §17–19: AI-generated
title/description grounded strictly in real structured data, a
deterministic advert-completeness checklist, and AI cover-photo
selection. Every generated claim about the vehicle must be traceable to a
field the seller or catalogue actually supplied — never invented, exactly
as the functions doc states twice: "AI must never invent service history,
options or vehicle condition."

"Done" means: generating an advert for a fixture vehicle produces text
that mentions only real equipment/condition/history, the completeness
checklist correctly reproduces the mockup's own worked example (92/100,
missing tyre condition and cosmetic condition), and cover-photo selection
picks a real uploaded photo the seller can override with one tap.

## 2. This plan vs. Plan 15's `ListingAiSummary` — not the same feature

Both plans generate AI text "about a listing," which could be confused as
one feature. They're deliberately different:

| | Plan 21 (this plan) | Plan 15 |
|---|---|---|
| Audience | Seller, during the wizard | Buyer, on the detail page |
| Trigger | Synchronous, on-demand ("Generate"/"Regenerate" button) | Asynchronous, once at publish/meaningful-edit time |
| Purpose | *Write* the advert's title/description | *Summarize* an already-published listing |

They share the same grounding discipline and likely the same underlying
AI provider call shape, but are separate endpoints with separate
triggers — this plan doesn't touch `ListingAiSummary`, and Plan 15 doesn't
touch this plan's generated title/description.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Vehicle model extension | Add `conditionNotes`, `tyreCondition` (enum: `GOOD`/`WORN`/`NEEDS_REPLACEMENT`), `keysCount`, `recentMaintenanceNotes` to Plan 11's `Vehicle` model | The mockup's own completeness checklist explicitly checks "Tyre condition" and "Cosmetic condition" as missing items — fields that don't exist anywhere in Plan 11's schema. This is a small, justified extension (same sanctioned-cross-plan-touch pattern used in Plans 06/11) needed to make the completeness checker's own worked example possible at all |
| Regenerate vs. manual edits | A `ConfirmDialog` (Plan 04 §8) before regenerating **only if** the seller has manually edited the current text — no versioning/undo history in V1 | Regeneration overwrites; warning only when there's something to lose keeps the common "didn't like it, try again" path frictionless while still protecting a seller's manual polish |
| Completeness scoring | **Fully deterministic** — combines Plan 12's existing photo-coverage endpoint with a field-presence check over `Vehicle`/`Listing` (including the new §3 fields) — no AI judgment involved | Consistent with every other "completeness/score" feature across this project (Plan 08's catalogue completeness, Plan 12's photo coverage, Plan 18's comparison superlatives): if a score can be computed from data we already have, it's computed, never asked of the AI |
| Cover-photo application | AI suggestion is **auto-applied** with a one-tap override in the Photo Manager, not held for confirmation | Low-stakes and instantly reversible (unlike a destructive action), matching how the mockups show a cover photo already selected/highlighted rather than presenting a confirm step |

## 4. Advert generation & regeneration

```text
POST /api/v1/listings/:id/advert/generate
  → builds a structured context object from Vehicle + Listing + Derivative +
    VehicleEquipment + VehicleModification (Plan 11/08 data — nothing else)
  → single Claude call (same provider/setup as Plan 14), instructed to use
    ONLY the supplied facts, no invented equipment/condition/history
  → { title, description }

POST /api/v1/listings/:id/advert/regenerate
  → identical to generate; front-end shows the ConfirmDialog from §3
    first if the current text differs from the last generated version
```

Rate-limited per user (proposed: 20 generate/regenerate calls per listing
per day) — generous for genuine iteration, bounded against cost abuse.

Grounding is enforced the same testable way as Plan 14/15/18: a test
injects a fixture vehicle with a known, limited equipment list and asserts
the generated description never mentions equipment outside that list.

## 5. Advert completeness (`GET /api/v1/listings/:id/completeness`)

```json
{
  "score": 92,
  "items": [
    { "field": "mileage", "status": "OK" },
    { "field": "serviceHistory", "status": "OK" },
    { "field": "specification", "status": "OK" },
    { "field": "recentMaintenance", "status": "OK" },
    { "field": "keysCount", "status": "OK" },
    { "field": "tyreCondition", "status": "WARNING", "message": "Tyre condition missing" },
    { "field": "conditionNotes", "status": "WARNING", "message": "Cosmetic condition missing" }
  ]
}
```

Reproduces the mockup's exact worked example. Scoring combines:

- Field presence across `Vehicle` (including §3's additions) and
  `Listing` (title/description/price set).
- Plan 12's `GET /media/coverage` result folded in as additional checklist
  items (e.g. "boot photo missing").

This endpoint is called by both the wizard (Plan 20's Review step) and
could later feed a seller-facing "improve your advert" nudge — but
building that nudge/notification is **not** this plan's job (that's
adjacent to Plan 23/24's territory if pursued).

## 6. AI cover-photo selection

```text
POST /api/v1/listings/:id/media/suggest-cover
  → Claude vision call over the listing's classified EXTERIOR photos
    (reusing Plan 12's VisionAiClient interface), scored on composition/
    lighting/vehicle visibility
  → sets the winning Media.isCoverPhoto = true (auto-applied per §3)
  → { coverMediaId }

PATCH /api/v1/media/:id/set-cover
  → manual override; service layer ensures exactly one Media per listing
    has isCoverPhoto = true (unsets any previous cover in the same
    transaction)
```

```prisma
// extends Plan 12's Media model
model Media {
  // ...existing fields
  isCoverPhoto Boolean @default(false) @map("is_cover_photo")
}
```

Learning which cover-photo styles produce higher click-through (functions
doc §18's "once sufficient data exists...") is explicitly **future work**
dependent on Plan 27/29's data — not attempted here.

## 7. Out of scope for this plan

- `ListingAiSummary` (buyer-facing summary) → **Plan 15**, distinct per §2
- AI photo categorization itself (Exterior/Interior/etc.) → **Plan 12**
  (this plan only adds the cover-photo layer on top)
- Learned cover-photo CTR optimization → future work, needs Plan 27/29
- Advert-completeness-driven notifications/nudges → adjacent to Plan
  23/24, not built here

## 8. Acceptance criteria

- [ ] Generating an advert for a fixture vehicle with a known, limited
      equipment list produces text mentioning only that equipment — never
      an invented feature, condition claim, or history detail.
- [ ] Regenerating after a manual edit shows the confirm dialog;
      regenerating with no manual edits does not.
- [ ] The completeness endpoint reproduces the mockup's 92/100 result
      exactly against an equivalent fixture (missing only tyre condition
      and cosmetic condition).
- [ ] `suggest-cover` sets exactly one `Media.isCoverPhoto = true`;
      manually setting a different photo's cover status correctly unsets
      the previous one — never two covers at once.
- [ ] The 20/day rate limit is enforced with a clear, toast-ready error.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm adding `conditionNotes`/`tyreCondition`/`keysCount`/
   `recentMaintenanceNotes` to Plan 11's `Vehicle` model — a real schema
   extension needed to match the mockup's completeness checklist.
2. Confirm the 20 generate/regenerate calls per listing per day limit.
3. Confirm auto-applying the AI's suggested cover photo (with easy
   override) rather than requiring the seller to explicitly accept it
   first.
