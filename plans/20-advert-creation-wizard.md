# Plan 20 — Advert Creation Wizard (Web + Mobile)

Status: Draft
Depends on: Plan 11 (the Vehicle/Listing CRUD + status lifecycle this
plan is the UX layer on top of — see §3 of Plan 11), Plan 10 (registration
lookup step), Plan 12 (photo upload step), Plan 04 (inline validation,
toasts, draft-save pattern) — and, functionally though numbered later,
**Plan 21** (AI-generated advert step) and **Plan 22** (AI price
recommendation step); see §3's sequencing note
Blocks: Plan 23 (Seller Dashboard's "My Adverts"/Drafts list reads what
this plan creates)

## 1. Objective

Build the single guided seller wizard —
**Vehicle → Details → Photos → Advert → Price → Review → Publish** — the
exact seven-step sequence stated verbatim, twice, in the pages doc. This
plan is the orchestration/UX layer only: registration lookup (Plan 10),
photo upload (Plan 12), and the underlying Vehicle/Listing create/update/
publish calls (Plan 11) already exist as reusable APIs; this plan's job is
sequencing them into one resumable, per-step-validated, draft-saving flow
on both web and mobile.

"Done" means: a seller can start a listing, leave partway through, come
back later from "My Adverts → Drafts," resume exactly where they left off,
and publish — with every step's fields validated inline as they type and
every step's progress saved incrementally, not lost if they close the app.

## 2. Decisions carried over from the pages doc

- Steps 5–22 (registration lookup through publish) work as **one guided
  wizard**, not a series of independent screens: **Vehicle → Details →
  Photos → Advert → Price → Review → Publish**.
- The same wizard structure applies on both web and mobile — content is
  the same, layout differs (web can show a live preview panel alongside
  the form; mobile is full-screen step-by-step, matching the mockups
  directly).
- "My Adverts" separates **Drafts** from Active/Reserved/Sold as a status
  filter, implying multiple concurrent drafts are a normal, supported
  state, not an edge case.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Sequencing vs. Plan 21/22 | The **Advert** step (AI title/description) and **Price** step (AI recommendation) call endpoints owned by Plan 21 and Plan 22 respectively. Build this wizard with those steps calling real Plan 21/22 endpoints if those plans have landed; otherwise ship with a **manual-entry fallback** (plain text fields, no AI assist) for just those two steps, upgraded to the AI-assisted version once 21/22 exist | This plan is numbered before 21/22 in the phase order but functionally depends on them for two of its seven steps — rather than blocking this entire plan on two others, the wizard degrades gracefully to a manual version of just those steps, matching the resilience pattern already used for AI provider failures in Plan 14 §7 |
| Package/Promotion/Checkout steps | **Omitted from V1 entirely** — the wizard goes straight from Price/Review to Publish, with no paid-boost step | The pages doc's own wizard includes these, but they depend on Plan 34 (Payments & Monetization), Phase 7 — building payment UI before that plan designs the actual provider integration would be backwards. Matches the project's own stated priority: prove the marketplace with free listings before monetizing it |
| Draft creation point | A `Vehicle` (status implicit via its `Listing`) and its `Listing` (`status: DRAFT`) are created as soon as the registration lookup step completes (or manual entry is chosen) — not deferred to the end of the wizard | This is what makes resumability possible at all: there has to be a real row to resume. Matches Plan 11 §5's deliberate nullable `derivativeId` design, which exists specifically so a vehicle can be in `DRAFT` before full confirmation |
| Save granularity | Each step's "Continue" action **PATCHes** the relevant Vehicle/Listing fields immediately via Plan 11's endpoints — no single giant submit at the end | Matches the "Save draft" button visible at multiple points in the mockups, and means closing the app mid-wizard never loses more than the current, unsaved step |
| Multiple concurrent drafts | Supported — starting "Sell a car" always creates a **new** draft; existing drafts are resumed only by explicitly opening them from "My Adverts → Drafts," never auto-resumed on next "Sell a car" tap | Matches the pages doc's "Drafts (1)" count implying more than one is normal (e.g., a seller starting to list two different cars) |

## 4. Step definitions

| Step | Fields / actions | Backing endpoint(s) |
|---|---|---|
| 1. Vehicle | Registration lookup + Make/Model/Generation/Derivative confirmation, or manual entry fallback | Plan 10's `vehicle-lookup` module |
| 2. Details | Mileage, owners, service history, condition, equipment selection, modifications, additional notes | Plan 11's `PATCH /vehicles/:id` + equipment/modification endpoints |
| 3. Photos | Upload, AI categorization, manual recategorization, reordering, coverage checklist | Plan 12's `media` module |
| 4. Advert | AI-generated title/description (or manual fallback per §3), advert-completeness indicator | Plan 21 (or manual fallback) |
| 5. Price | AI price recommendation (or manual entry per §3), market-range context | Plan 22 (or manual fallback) — reuses Plan 15 §5's placeholder assessment if Plan 22 hasn't landed yet either |
| 6. Review | Full preview exactly as buyers will see it, using the same Vehicle Detail rendering components from Plan 15 | Read-only, composed from prior steps' data |
| 7. Publish | Final publish action, enforcing Plan 11 §7's `DRAFT → LIVE` rules | Plan 11's `POST /listings/:id/status` |

Step 6 (Review) deliberately **reuses Plan 15's actual detail-page
rendering components**, not a separate preview implementation — the
seller should see literally the same page a buyer will, not an
approximation of it that could drift out of sync.

## 5. Draft resume & step gating

- Each step is only enterable once the previous step's required fields are
  complete — enforced client-side (disabling "Continue") and server-side
  (Plan 11's publish-blocking rules are the final backstop at step 7,
  regardless of what the client allowed).
- Resuming a draft loads all previously-saved data into each step's form
  via the same Zod schemas used to save it — no separate "resume" data
  shape.
- A `DELETE /api/v1/listings/:id` is added by this plan (not part of Plan
  11's core CRUD), allowed **only** while `status = DRAFT` — "discard this
  draft" is a wizard-specific action, not a general listing-deletion
  feature (Plan 11 deliberately didn't build general deletion; published
  listings are archived, never deleted).

## 6. Front-end architecture

- **Web**: one wizard route (`/sell/[listingId]/[step]`) so each step is
  a real, bookmarkable/back-button-friendly URL; step state lives in
  React Hook Form per step, submitted via the generated API client on
  "Continue."
- **Mobile**: Expo Router stack matching the same step sequence; step
  state in the same React Hook Form pattern (per Plan 04 §3's decision to
  use RHF on mobile too) so the validation behavior is identical, not
  just similar, to web.
- A shared `useAdvertWizard(listingId)` hook (in a new
  `packages/advert-wizard` or colocated per-app if sharing proves awkward
  across Next.js/Expo Router's different routing models) centralizes
  "which step is next," "is this step complete," and "can I publish yet"
  logic so web and mobile can't silently diverge on wizard rules.

## 7. Out of scope for this plan

- The actual AI generation/recommendation logic → **Plan 21**/**Plan 22**
  (this plan only orchestrates calling them)
- Package/Promotion/Checkout → **Plan 34**, explicitly deferred per §3
- General listing editing after publish (price changes, pausing, marking
  sold) → already covered by Plan 11's status-transition endpoints,
  exposed through Plan 23's Seller Dashboard, not re-built here
- Advert performance/funnel display → **Plan 23**

## 8. Acceptance criteria

- [ ] Completing step 1 immediately creates a real `DRAFT` `Vehicle`/
      `Listing` pair, visible in "My Adverts → Drafts" even if the wizard
      is abandoned there.
- [ ] Closing the app/browser mid-step-2 and resuming from Drafts restores
      every previously-entered field correctly.
- [ ] Attempting to publish with no confirmed derivative or no photos is
      blocked with a clear, field-appropriate error, per Plan 11 §7.
- [ ] The Review step renders using Plan 15's actual detail-page
      components, not a separate implementation — verified by shared
      component usage, not duplicated markup.
- [ ] With Plan 21/22 unavailable (simulated), steps 4 and 5 fall back to
      manual entry and the wizard still completes successfully end to end.
- [ ] Starting "Sell a car" a second time while a draft already exists
      creates a second, independent draft rather than resuming the first.
- [ ] Deleting a `DRAFT` listing succeeds; attempting to delete a `LIVE`
      one via the same endpoint is rejected.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm omitting Package/Promotion/Checkout from the V1 wizard
   entirely (§3) rather than, say, a placeholder "coming soon" step.
2. Confirm the manual-entry fallback approach for steps 4/5 if Plan 21/22
   aren't built yet at the time this plan is implemented — or would you
   rather sequence the actual build order so 21/22 land first?
3. Any retention policy wanted for abandoned drafts (e.g. auto-archive
   after 90 days of inactivity), or is indefinite retention with manual
   deletion fine for V1?
