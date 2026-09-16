# Plan 10 — DVLA Vehicle Lookup & Seller Matching

Status: Implemented — resolved 2026-09-14
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

- [x] `DvlaClient`'s fake implementation returns realistic fixture data in
      Local/Test, and the real implementation is only ever configured in
      environments where `DVLA_API_KEY` is present.
- [x] `POST /vehicle-lookup/dvla` with a fixture "found" registration
      returns the expected fields and creates a `VehicleLookup` row,
      including the raw response for audit.
- [x] A fixture "not found" registration returns a clear, toast/field-
      appropriate error (per §6) rather than a raw DVLA error passthrough.
- [x] Given a fixture DVLA result matching Plan 08's BMW M4 fixture's
      year/engine/fuel, `derivative-candidates` correctly ranks the G82
      Competition xDrive above unrelated derivatives.
- [x] `confirm` correctly stores `predictionAccepted: true` when the
      seller picks the top-ranked candidate, and `false` when they pick a
      different one or use manual matching.
- [x] The lookup endpoint is unreachable without an authenticated,
      verified-email session, and is throttled per-user beyond the global
      default.
- [x] `pnpm lint`/`typecheck`/`build`/`test` remain green (verified with
      real Postgres/Redis in Docker; see §10 on this plan's own added
      fixtures/tests).

## 9. Open questions for you — resolved 2026-09-14

1. **Confirmed** — §2's corrected understanding is what's built: DVLA
   supplies make/year/engine/fuel/colour/tax/MOT only, and the seller picks
   Model/confirms Derivative.
2. **Not yet — tracked as a setup task**, not a blocker. `DVLA_API_KEY`
   stays blank in every environment for now; `VehicleLookupModule`'s
   provider (§3/§8, `apps/api/src/modules/vehicle-lookup/dvla/dvla-client.factory.ts`)
   uses the fixture-backed `FakeDvlaClient` whenever it's blank and only
   switches to the real `DvlaHttpClient` once a key is set — no code change
   needed either way. See `docs/deployment-runbook.md` §2.1b for the
   provisioning steps to run once ready.
3. **Confirmed at 20/day** — `DvlaLookupThrottleGuard`
   (`apps/api/src/modules/vehicle-lookup/dvla-lookup-throttle.guard.ts`).
   Revisit if dealer/bulk-listing flows (Plan 33) need a higher per-account
   limit later.
4. **Real-world (fixture/DVLA-sandbox) end-to-end testing is deferred to a
   later setup step**, once a real `DVLA_API_KEY` exists — this plan ships
   against the fake client and its own fixtures (§8's acceptance criteria),
   which is what "done" means for now; revisit test coverage once real DVLA
   access is available.

## 10. Deviations from this plan worth flagging

- **`matchedMakeId` added to the DVLA lookup response** (not in §4's
  `VehicleLookup` snippet, which has no column for it): DVLA's `make` is
  free text with no link to Plan 08's `Make` table, and §5's own flow
  ("Seller selects Model from a Make-filtered catalogue list") needs a
  `makeId` to filter by. `VehicleLookupService.resolveMakeId` matches DVLA's
  make text against `Make.name` (case-insensitive), falling back to a
  `CatalogueAlias` (`entityType: 'MAKE'`) lookup for known manufacturer-name
  variants; `null` (no match) is a valid outcome the UI (§6) falls back to
  manual Make selection for. Computed on every read rather than persisted —
  cheap, and re-resolves automatically as the catalogue grows.
- **`VehicleLookup.requestedByUserId` is a real `@relation` to `User`**,
  not a loose id as §4's snippet shows — every row is created by an
  authenticated session, matching `Vehicle.owner`/`Listing.seller`'s
  convention rather than `CatalogueImport.importedBy`'s (optional,
  CLI-only-run) one.
- **`DvlaClient` real-vs-fake selection is config-presence-driven
  (`DVLA_API_KEY` set or blank), not a hard `APP_ENV` branch** as §3's
  table literally reads — same pattern as `EmailService`/`OPENAI_API_KEY`.
  Production doesn't have a real DVLA key yet either (§9.2), and silently
  falling back to fixture data in a live Production would be worse than
  this; the fake client is used in *any* environment without a key, the
  real one in *any* environment with one.
- **An upstream `nestjs-zod`/Zod-4 OpenAPI-generation bug**: a *bare*
  `z.string().nullable()` (no other checks) emits OpenAPI 3.1's
  `type: ["string", "null"]` shorthand, which `@nestjs/swagger`'s document
  builder silently mis-renders as `{ type: "array", items: { type: "string" } }`
  — `openapi-typescript` then (correctly, per that broken spec) types the
  field as `string[]` instead of `string | null`. Worked around by adding
  `.min(1)` to every nullable string field in `DvlaLookupResultSchema`
  (`packages/validation/src/vehicle-lookup/dvla-lookup-result.ts`), which
  steers the same conversion onto its (correct) `anyOf` path instead —
  nothing before this plan had run a bare-nullable-string Zod schema
  through `createZodDto`/`@ZodResponse` far enough to hit it. Worth
  revisiting if `nestjs-zod`/`zod` are ever upgraded past the versions
  pinned today.
- **The UI (§6) ships as `<VehicleLookupFlow>`, a single reusable component**
  (`apps/web/app/_components/vehicle-lookup/vehicle-lookup-flow.tsx`)
  covering the whole registration → Model → Derivative → confirm flow, plus
  a standalone demo route at `/dev/vehicle-lookup` (same spirit as Plan 04's
  `/dev/components`) so it's exercisable before Plan 20's wizard exists to
  host it. "Or enter manually"/"I'm not sure" call an `onManualFallback`
  prop rather than rendering real catalogue-browsing UI themselves — a
  generic Make→Model→Generation→Derivative browser doesn't exist yet as a
  reusable component; building one is Plan 20's job, not this plan's (§7).
- **Testing beyond this plan's own fixture-driven unit/integration suite is
  deferred** (§9.1/§9.4) — no live DVLA sandbox call has been exercised;
  revisit once a real (or DVLA-sandbox) `DVLA_API_KEY` exists.
