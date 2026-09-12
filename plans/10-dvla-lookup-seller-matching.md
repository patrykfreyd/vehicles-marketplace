# Plan 10 — DVLA Vehicle Lookup & Seller Matching

Status: Draft
Depends on: Plan 08 (catalogue schema to match against), Plan 09 (only
`APPROVED` derivatives are matchable), Plan 05 (Nest module — this is the
"Vehicle Lookup" module named directly in the stack doc's module list),
Plan 04 (registration-input form, inline validation, toasts)
Blocks: Plan 11 (`Vehicle.derivativeId` gets populated via this flow),
Plan 20 (the seller wizard's first step — "Sell your car → Enter your
registration → Find my car," shown directly in the mockups — is built on
top of this plan's endpoints)

## 1. Objective

Implement registration → vehicle-identification for sellers: call the
DVLA lookup, narrow the result down to a shortlist of candidate catalogue
derivatives, let the seller confirm the exact one (or fall back to manual
selection), and record that confirmation as feedback data per the idea
doc's §35. This plan delivers the **lookup and matching capability** as an
API module + reusable UI step — the full multi-step advert wizard around
it belongs to Plan 20.

"Done" means: entering a real UK registration returns DVLA's vehicle data,
the system proposes a ranked shortlist of derivatives from Plan 08/09's
approved catalogue, the seller can confirm one or say "none of these," and
that outcome is stored for future matcher improvement — all against a
mockable DVLA client so this works in Local/Test without hitting the real
government API or needing a real registration number.

## 2. Important correction to the idea doc's assumed DVLA response shape

`idea/vehicle_database_catalogue_approach.md` §18 illustrates DVLA
matching identifying `BMW 3 Series 2022 2998cc Petrol` — implying DVLA
returns a **model name**. The real DVLA Vehicle Enquiry Service (VES) API
does **not** return a model field. Its actual fields are limited to:

```text
registrationNumber, make, yearOfManufacture, engineCapacity,
fuelType, colour, co2Emissions, taxStatus, motStatus, motExpiryDate,
typeApproval, wheelplan, monthOfFirstRegistration, ...
```

No `3 Series`, no trim, no derivative — just **make**, not model. This
materially changes the matching flow from what the idea doc's example
implies, so this plan designs around the real constraint rather than the
idealized example:

```text
DVLA lookup
    ↓
Make + year + engine capacity + fuel + colour (confirmed, not guessed)
    ↓
Seller selects Model from a Make-filtered catalogue list
  (autocomplete against Plan 08's Model table — DVLA can't do this step)
    ↓
System narrows Generation by production-year range containing the reg year
    ↓
System ranks candidate Derivatives within matched generation(s) by
  fuel match + engine-capacity closeness
    ↓
Seller confirms the correct derivative, or "I'm not sure" → manual browse
```

This is still faithful to the idea doc's actual goal (§18: "a zero/low-cost
seller flow does not need perfect automatic derivative identification" and
the "I'm not sure" fallback) — it just corrects which step DVLA can
realistically do versus which step needs the seller's input.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| DVLA client abstraction | A `DvlaClient` interface (`lookup(registration): Promise<DvlaVehicleData>`) with a real HTTP implementation and a **fake implementation returning fixture data**, selected by `APP_ENV` | Local/Test development can't depend on the live DVLA API and a real UK registration number — same pattern as Plan 02's `StorageService` abstraction |
| Registration input validation | A **permissive** format check (alphanumeric, normalize whitespace/case), not a strict regex matching every historical UK plate format | UK plates have several historical formats (current, prefix, suffix, dateless); a too-strict regex will false-reject valid legacy plates — better to let DVLA's own "not found" response be the real validator and keep client-side validation to "looks plausible" |
| Access scope | Lookup endpoint requires an **authenticated, verified-email** user (per Plan 07 §3) and is only reachable from the sell flow — not a general "look up any registration" public feature | DVLA's API terms require legitimate business use, not open scraping; scoping to authenticated sellers starting a listing, plus heavy per-user rate limiting, keeps this compliant and cheap to defend if ever questioned |
| Candidate ranking | Simple deterministic scoring (exact fuel match required; engine-capacity closeness within a tolerance, e.g. ±50cc, ranked ascending by difference) — no ML | Matches the idea doc's own "does not need perfect automatic identification" framing; a learned ranking model is future work once real confirmation/correction data (§6) has accumulated |
| MOT/tax status handling | Store DVLA's `taxStatus`/`motStatus`/`motExpiryDate` on the vehicle record now (cheap, already returned by the same call), but **do not** build the full buyer-facing MOT History display in this plan | That display (pages doc's "MOT History" vehicle-detail section) belongs to Plan 11/15; this plan just doesn't throw away data DVLA already gave us for free |

## 4. Data model additions

```prisma
// prisma/schema/vehicle-lookup.prisma
model VehicleLookup {
  id                String   @id
  registration      String                        // as entered, normalized
  requestedByUserId String   @map("requested_by_user_id")

  dvlaMake          String?  @map("dvla_make")
  dvlaYearOfManufacture Int? @map("dvla_year_of_manufacture")
  dvlaEngineCapacityCc  Int? @map("dvla_engine_capacity_cc")
  dvlaFuel          Fuel?    @map("dvla_fuel")
  dvlaColour        String?  @map("dvla_colour")
  dvlaTaxStatus     String?  @map("dvla_tax_status")
  dvlaMotStatus     String?  @map("dvla_mot_status")
  dvlaMotExpiryDate DateTime? @map("dvla_mot_expiry_date")
  dvlaRawResponse   Json?    @map("dvla_raw_response")   // full payload, for audit/debugging

  candidateDerivativeIds String[] @map("candidate_derivative_ids")
  selectedDerivativeId   String?  @map("selected_derivative_id")
  matchedManually        Boolean  @default(false) @map("matched_manually")
  predictionAccepted     Boolean? @map("prediction_accepted") // null until confirmed

  createdAt DateTime @default(now()) @map("created_at")

  @@index([requestedByUserId])
  @@map("vehicle_lookups")
}
```

`predictionAccepted` is exactly the idea doc §35 feedback signal ("did the
seller change the system's prediction, yes/no") — cheap to store now,
valuable once enough rows exist to review which generations/derivatives
the matcher gets wrong most often.

## 5. API module (`apps/api/src/modules/vehicle-lookup`)

```text
POST /api/v1/vehicle-lookup/dvla
  body: { registration }
  → normalizes input, calls DvlaClient, stores a VehicleLookup row,
    returns the DVLA fields (never the seller's other vehicles' data —
    this endpoint only ever returns what was just looked up)

GET /api/v1/vehicle-lookup/:id/model-candidates?makeId=...
  → catalogue Models under that make, for the seller's autocomplete step

GET /api/v1/vehicle-lookup/:id/derivative-candidates?modelId=...
  → ranked APPROVED derivatives (§3's scoring), using the stored
    VehicleLookup's year/engine/fuel

POST /api/v1/vehicle-lookup/:id/confirm
  body: { derivativeId, matchedManually }
  → records the seller's final choice + predictionAccepted, per §4
```

Every route requires an authenticated, verified session (Plan 07);
`POST /dvla` additionally carries a strict per-user throttle (e.g. 20/day)
layered on Plan 05's global default — legitimate sellers list a handful of
cars, not hundreds.

## 6. UI (delivered as a reusable step; Plan 20 assembles the full wizard)

Matches the mockups directly: a registration-plate-styled input ("Enter
your registration" / "YA22 GZX" / "Find my car" button), with:

- Inline validation (Plan 04 §6) on the plausibility check from §3 — shown
  below the input as the user types.
- An **"or enter manually"** link/fallback always visible (present in the
  mockup itself), which skips straight to Make→Model→Generation→
  Derivative catalogue browsing with no DVLA call at all.
- A "not found" DVLA response renders as an inline error under the input
  ("We couldn't find a vehicle with that registration") with the manual
  fallback offered immediately, not a dead end.
- A DVLA service failure (network/5xx) shows a **toast** (Plan 04 §7) —
  it's a transient service problem, not something wrong with what the user
  typed, so it doesn't belong in the field-error slot.
- Once DVLA returns Make/year/engine/fuel, the seller picks Model from an
  autocomplete (Plan 08's `Model` table, filtered by the confirmed Make),
  then sees the ranked derivative shortlist with an "I'm not sure" option
  that falls back to browsing every derivative in the matched
  generation(s) manually.

## 7. Out of scope for this plan

- The rest of the advert-creation wizard (details, photos, price, review,
  publish) → **Plan 20**
- Buyer-facing MOT History / full vehicle history timeline display →
  **Plan 11/15** (this plan only stores the raw DVLA tax/MOT fields
  alongside the lookup)
- Outstanding-finance / write-off / stolen-vehicle checks → **Plan 30**
  (Trust & Verification) — DVLA VES doesn't provide these; they'd need a
  separate, likely paid, data source, deliberately not pursued in V1
- Any ML-based matching improvement → future work once confirmation data
  from §4 has accumulated

## 8. Acceptance criteria

- [ ] `DvlaClient`'s fake implementation returns realistic fixture data in
      Local/Test, and the real implementation is only ever configured in
      environments where `DVLA_API_KEY` is present.
- [ ] `POST /vehicle-lookup/dvla` with a fixture "found" registration
      returns the expected fields and creates a `VehicleLookup` row,
      including the raw response for audit.
- [ ] A fixture "not found" registration returns a clear, toast/field-
      appropriate error (per §6) rather than a raw DVLA error passthrough.
- [ ] Given a fixture DVLA result matching Plan 08's BMW M4 fixture's
      year/engine/fuel, `derivative-candidates` correctly ranks the G82
      Competition xDrive above unrelated derivatives.
- [ ] `confirm` correctly stores `predictionAccepted: true` when the
      seller picks the top-ranked candidate, and `false` when they pick a
      different one or use manual matching.
- [ ] The lookup endpoint is unreachable without an authenticated,
      verified-email session, and is throttled per-user beyond the global
      default.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm the corrected DVLA-response understanding in §2 — this is a
   meaningful change from the idea doc's example and affects how many
   manual steps the seller flow actually needs.
2. Do you already hold a DVLA VES API key, or does provisioning one need
   to be tracked as a setup task before this plan's real (non-fake) client
   can be used in Test/Production?
3. Confirm the per-user daily throttle figure in §5 (20/day proposed) —
   too strict for a dealer bulk-listing many cars, or reasonable for V1
   private-seller-first launch?
