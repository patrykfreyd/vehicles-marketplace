# Plan 29 — Personalization & Recommendations

Status: Draft
Depends on: Plan 27 (`analytics_events` — the raw behavioral signal),
Plan 16 (this plan **replaces** its placeholder "For You" ranking, keeping
its diversity/gesture contract intact), Plan 17 (`Like`/`Watchlist` as
explicit signals), Plan 13 (recommendations are still, underneath,
real search-service results)
Blocks: nothing structurally downstream

## 1. Objective

Build the interest-profile derivation, personalized "For You" ranking, and
Buyer Intent Score from
`idea/marketplace_analytics_user_engagement_tracking.md` §17–21 — finally
replacing Plan 16 §3's explicitly-flagged placeholder heuristic with real
personalization, while keeping that heuristic alive as the **cold-start
fallback** for users without enough history yet.

"Done" means: a user who has repeatedly engaged with BMW M3/M4 listings
sees noticeably more of them in For You (without the feed becoming
repetitive — an explicit functions-doc requirement), a brand-new user
still gets Plan 16's original recency+diversity feed unchanged, and every
recommendation is traceable end-to-end via Plan 27's already-reserved
`recommendation_id` column.

## 2. Decisions carried over from the analytics doc

- **"Do not over-invest in the exact scoring model initially... the
  scoring model can then evolve without losing historical data"** (§18) —
  quoted directly because it's the governing principle for this entire
  plan: a simple, transparent weighted-points model, not a machine-
  learning system, is the correct V1 scope.
- Buyer intent hierarchy point values (view +1, dwell >60s +2, interior
  viewed +1, compare +3, like +2, watch +5, return +4, message +10,
  viewing request +20) — used directly, not reinvented.
- Recommendations must **occasionally introduce cars outside the
  profile** to prevent the feed becoming repetitive — an explicit
  requirement, not a nice-to-have.
- Every recommendation needs `recommendation_id`/`algorithm_version`/
  `position`/`surface` for later comparison — Plan 27's `analytics_events`
  schema already reserved the `recommendationId` column specifically for
  this.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Storage shape | `UserInterestProfile.weights` as **JSONB**, not per-entity columns | This is the one place in the whole project where JSONB is genuinely the right call rather than a shortcut — Plan 03's "real columns for important dimensions" rule was about small, fixed-cardinality dimensions (statuses, enums); a per-user weight map over potentially thousands of makes/models/generations is exactly the open-ended, evolving case JSONB exists for |
| Time decay | Exponential decay, ~30-day half-life, applied when computing weights | An interest profile should reflect *current* interest, not permanent history — someone who briefly researched estate cars two years ago shouldn't still be shown them today |
| Cold-start threshold | Below **5 tracked interactions**, use Plan 16's original recency+diversity heuristic unchanged, not a degraded personalized score | A profile computed from 1–2 data points is noise, not signal — better to be honest about not having enough information yet than to rank on it anyway |
| Exploration/diversity | **80% personalized-ranked / 20% randomly injected** from outside the user's top-weighted profile, within the same derivative-diversity-constrained candidate set Plan 16 already builds | Directly implements the functions doc's explicit "should still occasionally introduce cars outside the profile" requirement with the simplest mechanism that satisfies it — no need for a full multi-armed-bandit system in V1 |
| Recommendation surfaces | **One shared `PersonalizationService.scoreListing(userId, listing)`** function, called by both Plan 16's mobile For You feed and a new web homepage "Recommended for you" carousel | Avoids the classic mistake of reimplementing scoring logic per screen — one scoring function, multiple call sites |
| Buyer Intent Score exposure | Computed and stored, but **not exposed anywhere** in V1 (no seller-facing "hot lead" indicator, no buyer-facing display) | A genuinely valuable future application (seller lead-scoring) that raises its own product/privacy questions this plan isn't scoped to answer — computing and storing the signal now (so history isn't lost) while deliberately not building a feature on top of it yet is the right amount of restraint |

## 4. Data model

```prisma
model UserInterestProfile {
  id              String   @id
  userId          String   @unique @map("user_id")
  weights         Json                                // { makes: {...}, models: {...}, attributes: {...} } — analytics doc §20 shape
  algorithmVersion String  @map("algorithm_version")
  computedAt      DateTime @default(now()) @map("computed_at")

  @@map("user_interest_profiles")
}

model BuyerIntentScore {
  id        String   @id
  userId    String   @map("user_id")
  listingId String   @map("listing_id")
  score     Int
  computedAt DateTime @default(now()) @map("computed_at")

  @@unique([userId, listingId])
  @@map("buyer_intent_scores")
}
```

`BuyerIntentScore` is per-(user, listing) — "how engaged is this specific
buyer with this specific car" — a genuinely different concept from Plan
24's `HIGH_INTEREST` alert, which is supply-side ("many people are
looking at this car" via view/impression anomaly). No overlap; both can
exist without conflict.

## 5. Profile computation (nightly, bounded)

```text
For each user active in the last 30 days (bounds compute cost — an
inactive user's stale profile just isn't recomputed until they return):
    Read their analytics_events for the lookback window
    Apply Buyer Intent Hierarchy point values (§2) per event
    Apply exponential time decay
    Aggregate into per-make/model/generation/attribute weights,
      normalized 0–1 relative to the user's own maximum
    Write UserInterestProfile.weights, bump algorithmVersion only if the
      formula itself changed (not on every routine recomputation)
```

Same nightly worker process already established in Plans 12/23/28.

## 6. "For You" ranking (replaces Plan 16 §3's placeholder)

```text
Candidate pool: identical to Plan 16's existing candidate query
  (recent listings, same-derivative-diversity constraint already applied)
        ↓
User has ≥5 tracked interactions?
   NO  → Plan 16's original recency+diversity ranking, unchanged
   YES → score each candidate against UserInterestProfile.weights,
         rank by score, then splice in 20% exploration items (§3)
        ↓
Attach a fresh recommendationId + algorithmVersion to the response
```

Plan 16's endpoint contract (`GET /discover/feed?tab=FOR_YOU`) doesn't
change — only its internal ranking function does, so Plan 16's existing
diversity/gesture acceptance criteria still hold unmodified.

## 7. Recommendation analytics (extends Plan 27 §6's checklist)

```text
RECOMMENDATION_IMPRESSION, RECOMMENDATION_CLICK, RECOMMENDATION_LIKE,
RECOMMENDATION_WATCH, RECOMMENDATION_ENQUIRY
```

Fired with `recommendationId`/`algorithmVersion`/`surface`/`position`
already reserved in Plan 27's `analytics_events` schema — this plan just
populates and instruments them, the same small additive pattern Plan 27
§6 used for every other feature's tracking calls.

## 8. Out of scope for this plan

- Any seller-facing lead-scoring feature built on `BuyerIntentScore` →
  explicitly deferred per §3, a future product decision, not built here
- Machine-learning-based ranking (embeddings, learned models) → the
  weighted-points approach is the deliberate V1 scope per §2's quoted
  principle
- Similar Cars on the Vehicle Detail page → unchanged, stays Plan 15's
  catalogue-similarity logic, not personalized
- A/B testing infrastructure for comparing `algorithmVersion`s → this
  plan only makes that comparison *possible* by recording the version;
  actually running a comparison is future work

## 9. Acceptance criteria

- [ ] A fixture user with a clear pattern (5+ BMW M3/M4 interactions,
      decayed appropriately) sees a measurably higher proportion of BMW
      M3/M4 listings in For You than a cold-start user against the same
      candidate pool.
- [ ] A user with fewer than 5 tracked interactions receives exactly Plan
      16's original heuristic output — verified by comparing against that
      plan's own existing test fixtures, unchanged.
- [ ] Roughly 20% of a personalized user's returned feed items are
      demonstrably outside their top-weighted profile (the exploration
      injection), not just coincidentally low-ranked.
- [ ] The mobile For You feed and the new web homepage carousel produce
      consistent relative rankings for the same user against the same
      candidate — verified by both calling the identical
      `PersonalizationService` function, not duplicated logic.
- [ ] `RECOMMENDATION_IMPRESSION`/`CLICK` events correctly carry a
      `recommendationId` that a later `RECOMMENDATION_ENQUIRY` on the same
      listing can be traced back to.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm the 80/20 exploration split and the 5-interaction cold-start
   threshold, or would you like either tuned differently?
2. Confirm keeping `BuyerIntentScore` entirely internal/unexposed for V1
   — worth flagging now as a future seller-facing feature to plan for
   separately, or should it be dropped from scope entirely until there's
   a concrete product need?
3. Any specific attribute (beyond make/model/generation) you'd want
   weighted in the interest profile from day one — e.g. price range or
   body style specifically, given their prominence in the mockups?
