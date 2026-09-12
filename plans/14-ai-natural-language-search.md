# Plan 14 — AI Natural-Language Search & Car Finder

Status: Draft
Depends on: Plan 13 (`SearchRequestSchema` and the search service AI
output must resolve into), Plan 03 (Zod-as-source-of-truth convention),
Plan 05 (Nest module), Plan 02 (`AI_API_KEY` — this plan is where the
provider gets fixed concretely, see §3)
Blocks: nothing structurally downstream — this is a leaf feature — but
delivers the "AI Search" / "AI Car Finder" screens named directly in the
pages doc (web items 3/16, mobile items 16–17)

## 1. Objective

Implement two related but distinct AI-powered discovery features from
`idea/vehicle_marketplace_web_mobile_functions.md` §6–7:

- **AI Search** — free-text, conversational search ("a fast estate, ~£30k,
  petrol, automatic, 300+ bhp, adaptive cruise, 2021+") that resolves into
  Plan 13's structured filter shape, with follow-up refinement ("make it
  under £27k") updating the same underlying filter rather than starting
  over.
- **AI Car Finder** — a guided Q&A ("help me choose") that produces
  ranked, explained recommendations with a match percentage, grounded
  entirely in real inventory data.

Both share one governing rule, restated directly from the stack doc §21:
**the AI never touches the database and never invents which real vehicles
exist or what they cost** — it only ever produces a validated, structured
query that Plan 13's own deterministic search service executes.

"Done" means: a natural-language query correctly resolves to a Plan 13
search call and returns real matching listings; a follow-up message
correctly narrows the *same* search rather than resetting it; and Car
Finder produces recommendations whose explanatory text only ever
references specs that are actually true of the real, returned vehicles.

## 2. The two-phase architecture (this plan's core anti-hallucination design)

```text
Phase 1 — EXTRACT (AI, cheap/fast)
  User message + conversation history
    → Claude, tool use with strict:true against an AiSearchFilterSchema
      (a JSON Schema generated from a Zod schema, per Plan 03's pattern)
    → a validated structured filter object — nothing else comes out of
      this call; the AI cannot emit prose here, only the tool call

Phase 2 — SEARCH (deterministic, our code, no AI)
    → Plan 13's existing search service runs the validated filter
    → real listings, real prices, real specs — ground truth

Phase 3 — EXPLAIN (AI, only for Car Finder's "why this car" reasoning;
  standard AI Search skips this phase and just shows results directly)
  → Claude is given ONLY the Phase 2 results as context and instructed
    to reason solely from that data — it cannot mention a vehicle, price,
    or spec that isn't literally present in what Phase 2 returned
```

This is the concrete mechanism satisfying the functions doc's own
requirement ("AI-generated claims must be grounded... must not invent
vehicle condition, equipment, history") — grounding isn't a prompt
instruction hoping for the best, it's a structural guarantee: Phase 3
physically cannot see any vehicle that Phase 2 didn't already validate as
real.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| AI provider/model | **Anthropic Claude** — `claude-opus-5` as the default per current guidance, with `claude-sonnet-5` flagged as a strong cost/latency-conscious alternative specifically because this is a high-volume, latency-sensitive, structured-extraction task rather than an open-ended reasoning one | This is the first plan whose core value is the AI capability itself, so it's the right place to fix a concrete provider (Plans 09/12 deliberately stayed provider-agnostic). Model/cost tradeoffs are explicitly your call, not mine to downgrade unilaterally — see open question 1 |
| Structured output mechanism | **Tool use with `strict: true`**, schema generated via the same `zod-to-json-schema` approach already used in Plan 03/08, from a dedicated `AiSearchFilterSchema` (a constrained subset of Plan 13's `SearchRequestSchema` — no `page`, `sort`, or `searchId`, which the AI has no business setting) | `strict: true` guarantees the tool call's arguments validate exactly against the schema — this is what makes Phase 1's output safe to feed directly into Plan 13's search without a "hope the AI formatted it right" step |
| Conversation state | Redis-backed session (`AI_SEARCH_SESSION:<id>`, ~30 min TTL), holding message history + the last resolved filter object; the response returns an `aiSearchSessionId` the client echoes back on the next turn | Matches Redis's existing "temporary state" role from the stack doc §10 — no new persistent storage needed for what's inherently short-lived, disposable conversation state |
| Effort/thinking tuning | **Low effort** for Phase 1 extraction (it's structured extraction, not deep reasoning — cost-sensitive at high volume); a bit more room (default/medium) for Phase 3's explanatory pass, which benefits from actually reasoning about tradeoffs between the returned cars | Matches general Claude cost-tuning guidance that extraction/classification-shaped work doesn't need high effort, while comparison/explanation benefits from it |
| Env var | Add **`ANTHROPIC_API_KEY`** to the `.env.example` contract, replacing the generic placeholder `AI_API_KEY` reserved in Plan 02 now that the provider is concretely fixed | Plan 02 deliberately left this abstract until a plan actually needed a real provider — this is that plan |

## 4. `AiSearchFilterSchema` (`packages/validation/src/ai-search`)

A deliberately narrower schema than Plan 13's full `SearchRequestSchema`:

```ts
export const AiSearchFilterSchema = SearchRequestSchema.omit({
  page: true,
  sort: true,
}).extend({
  clarifyingQuestion: z.string().optional(), // set instead of filters when the AI needs more info
});
```

Allowing `clarifyingQuestion` as an alternative output (rather than forcing
a guess) directly supports the functions doc's conversational examples —
if a query is too vague, the tool call can ask ("What's your rough budget?")
instead of the model fabricating filter values to fill the schema.

## 5. AI Car Finder specifics

The guided Q&A (budget, mileage, family size, commute, driving type,
performance expectations, practicality, preferred features, priorities —
functions doc §7) produces, via the same strict-tool-use pattern, a
**weighted-criteria object**, not a direct recommendation:

```ts
export const CarFinderCriteriaSchema = z.object({
  maxPricePence: z.number().int(),
  weights: z.object({
    practicality: z.number().min(0).max(1),
    performance: z.number().min(0).max(1),
    economy: z.number().min(0).max(1),
    // ...
  }),
  requiredEquipmentIds: z.array(z.string()).default([]),
});
```

Our own code — not the AI — runs Plan 13's search against these
criteria and computes each result's match percentage deterministically
(a weighted score against the criteria), producing the ranked list
("BMW 330i — 96% match"). **Only then** does Phase 3 generate the
human-readable "why this fits" text, grounded in that already-computed,
already-real ranked list — the AI never invents the match percentage
itself.

## 6. API (`apps/api/src/modules/ai-search`)

```text
POST /api/v1/ai-search/message
  body: { sessionId?, message }
  → Phase 1 → Phase 2 → { sessionId, filters, results: PageResponseSchema<SearchResult>, searchId }
  → or { sessionId, clarifyingQuestion } if the AI needs more information

POST /api/v1/ai-search/car-finder/message
  body: { sessionId?, message }
  → guided Q&A turn; once enough criteria are gathered, runs §5's pipeline
  → { sessionId, recommendations: [{ derivativeId, matchScore, reasoning }] }
    or { sessionId, nextQuestion }
```

Both routes require an authenticated session (not necessarily verified
email — browsing/searching stays low-friction per Plan 07 §3) and carry a
strict per-user rate limit (proposed: 60 messages/hour) layered on Plan
05's global default, since every call costs real money.

## 7. Failure handling

- A malformed/unparseable AI response (rare given `strict: true`, but
  possible on a provider error) falls back to a **toast** ("AI Search is
  having trouble right now — try the regular filters") rather than a hard
  500, with conventional search always available as a fallback path.
- A provider timeout/error is retried once, then fails gracefully the
  same way — never left as a spinner with no resolution.

## 8. Operational data this plan exposes (owned/aggregated by Plan 27, not built here)

Every AI call logs: feature (`AI_SEARCH` / `AI_CAR_FINDER`), phase, model,
latency, input/output token counts, an estimated cost, and success/
failure — matching the stack doc §26's exact "AI Analytics" requirement.
This plan **emits** that data in a structured shape; Plan 27 owns
ingesting it into `analytics_events` and building the cost/value reporting
described there. Same boundary pattern as Plan 10's `predictionAccepted`
and Plan 12's `coverage` endpoint — this plan doesn't throw the data away,
but doesn't build the dashboard either.

## 9. Out of scope for this plan

- Conventional structured/advanced search itself → **Plan 13** (this plan
  only produces its input)
- Saved searches, search alerts → **Plan 17**
- AI Comparison, AI Vehicle Assistant ("Ask AI about this car"), AI Seller
  Coach, AI advert generation → separate AI features with their own
  grounding requirements, each belonging to the plan for the screen they
  power (Plan 15/18/21/23) — this plan does not attempt to be "the one AI
  module" for the whole product, per the stack doc's own §38 architecture
  ("multiple AI capabilities," not one generic chatbot)
- AI cost dashboards/alerting → **Plan 27/28**

## 10. Acceptance criteria

- [ ] The functions doc's own example query ("a fast estate, preferably
      German, around £30k, petrol, automatic, at least 300 bhp, adaptive
      cruise... nothing older than 2021") resolves to a correct
      `AiSearchFilterSchema` object via a strict tool call.
- [ ] A follow-up message ("make it under £27k") correctly narrows the
      *existing* session's filter rather than returning an unrelated new
      search.
- [ ] A deliberately vague query ("something nice and fast") produces a
      `clarifyingQuestion` rather than a guessed filter.
- [ ] Car Finder's match percentage is computed by our own scoring code
      and is reproducible given the same criteria + inventory — not
      re-generated by the AI on each call.
- [ ] Car Finder's explanatory text never references a spec, price, or
      feature that isn't literally present in the real returned results
      (checked by a test that injects a known fixture result set and
      asserts the explanation doesn't hallucinate an absent feature).
- [ ] A simulated provider failure results in a toast and a working
      fallback to conventional search, not a stuck UI.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 11. Open questions for you

1. Confirm `claude-opus-5` vs. `claude-sonnet-5` for this feature —
   Opus is the safer default for quality, Sonnet is meaningfully cheaper
   and likely sufficient for structured extraction at this task's
   complexity; this is a cost/quality tradeoff that's genuinely yours to
   call, not mine to decide unilaterally.
2. Confirm the proposed 60 messages/hour per-user rate limit, or would
   you like it tuned differently given the real per-call cost?
3. Do you want AI Search available to unverified-email users (browsing-
   only, per Plan 07 §3's low-friction principle), or should it require
   verification too, given each message has a real cost?
