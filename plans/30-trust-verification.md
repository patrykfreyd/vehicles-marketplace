# Plan 30 — Trust & Verification

Status: Draft
Depends on: Plan 10 (a successful DVLA lookup already implies
registration verification), Plan 15 (`VehicleMotHistory` — reused for the
mileage-consistency check), Plan 11 (`Vehicle`), Plan 13 (adds a
"verified only" filter), Plan 07 (`emailVerified` reused for the seller
badge)
Blocks: nothing structurally downstream; Plan 31 (Fraud) can consume the
signals this plan computes as additional input, without depending on them

## 1. Objective

Implement the "Verified Vehicle" and "Verified Seller" badges from
`idea/vehicle_marketplace_web_mobile_functions.md` §35, using only data
this marketplace can obtain for free (a successful DVLA lookup, MOT-
history mileage cross-referencing, email+phone verification) for V1's
baseline trust bar — while clearly flagging, not silently skipping, the
paid third-party checks (VIN decode, outstanding finance, stolen-vehicle,
full ID verification) the idea doc also describes as a deliberately
deferred, future paid tier.

"Done" means: a vehicle whose registration was confirmed via Plan 10's
DVLA lookup and whose declared mileage is consistent with its real MOT
history shows a "Verified Vehicle" badge computed from real, current
data — never a manually-set flag that can silently go stale — and buyers
can filter search to verified vehicles only.

## 2. Decisions carried over from the functions doc

- "✓ Verified Vehicle" checks: registration verified, VIN verified, V5C
  checks where possible, mileage checked, history checked.
- "✓ Verified Seller": identity verification.
- **"Dealer verification should be handled separately"** — the functions
  doc's own explicit line, meaning dealer-specific verification is
  entirely Plan 33's concern, not this plan's.
- Buyers should eventually be able to filter "verified vehicles only."

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Two-tier vehicle verification | **Tier 1 (V1, free)**: registration verified (a successful Plan 10 DVLA lookup) + mileage-consistency check (against Plan 15's real MOT history). **Tier 2 (deferred)**: VIN decode, outstanding finance, stolen-vehicle, full write-off history — all require a paid third-party data source (classic "HPI check" style UK providers) | VIN/finance/stolen checks genuinely can't be done for free — rather than silently dropping them or building them without a funding model, this plan ships the free tier now and names the paid tier explicitly as future work, likely funded through Plan 34's payment infrastructure once that exists |
| Two-tier seller verification | **Tier 1 (V1)**: verified email (already exists, Plan 07) + a new verified **phone number** (SMS OTP, cheap per-message cost). **Tier 2 (deferred)**: full ID/KYC verification via a third-party provider | Mirrors the vehicle-verification tiering for the same reason — a real identity-document check has real per-verification cost and likely regulatory considerations that deserve their own decision, not a default bolted onto this plan |
| Badge computation | **Computed at query/render time from real underlying data**, never a manually-set flag — with an optional `manualVerificationOverride` field for genuine edge cases an admin needs to resolve | A hand-toggled "verified" flag can silently go stale (e.g. a later MOT record reveals an inconsistency); computing it from current real data means the badge is always honest, with a human override available only as an explicit exception, not the default mechanism |
| Search-filter performance | The **mileage-consistency check result is stored** as `Vehicle.mileageConsistencyFlag`, recomputed only when MOT history is refreshed (not on every search query); registration verification is a fact set once at vehicle creation. The "verified only" filter is then a cheap indexed boolean check, not a live computation per search | Consistent with Plan 13's established position against premature denormalization — this isn't a new materialized search index, just storing a signal that's genuinely expensive to *derive* but cheap to *store*, recomputed only when its source data actually changes |

## 4. Data model

```prisma
// extends Plan 07's User
model User {
  // ...existing fields
  phoneNumber   String?  @map("phone_number")
  phoneVerified Boolean  @default(false) @map("phone_verified")
}

// extends Plan 11's Vehicle
model Vehicle {
  // ...existing fields
  registrationVerified      Boolean  @default(false) @map("registration_verified")
  mileageConsistencyFlag    Boolean  @default(true) @map("mileage_consistency_flag") // true = no issue found
  manualVerificationOverride Boolean? @map("manual_verification_override")
}
```

`registrationVerified` is set `true` automatically the moment a `Vehicle`
is created via a successful Plan 10 DVLA lookup (vs. the manual-entry
fallback, which leaves it `false`) — it doesn't need re-checking later
since a vehicle's registration doesn't change.

## 5. Mileage-consistency check

```ts
function checkMileageConsistency(vehicle: Vehicle, motHistory: VehicleMotHistory[]): boolean {
  // flags inconsistency if declared current mileage is less than the most
  // recent MOT test's recorded odometer reading, or if odometer readings
  // decrease between successive MOT tests — a real, simple clocking signal
}
```

This function is owned by this plan, but **called from Plan 15's existing
DVSA MOT-history fetch code** (one small addition to an already-built
integration, not a new fetch pipeline) — every time MOT history is
fetched or refreshed, `Vehicle.mileageConsistencyFlag` is recomputed and
stored.

## 6. Phone verification (OTP)

```text
POST /api/v1/users/me/phone/verify-request   { phoneNumber } → sends OTP via SMS
POST /api/v1/users/me/phone/verify-confirm   { code } → sets phoneVerified = true
```

Uses **Twilio** (or an equivalent SMS provider) — a new external
dependency, same pattern as Plan 07's Resend decision, reserved via a new
`SMS_API_KEY`/`TWILIO_*` env var. Rate-limited per phone number (e.g. 5
requests/hour) to bound both abuse and cost, since every OTP costs real
money to send.

## 7. Badges & the search filter

```text
VerifiedVehicle = manualVerificationOverride ?? (registrationVerified AND mileageConsistencyFlag)
VerifiedSeller  = emailVerified AND phoneVerified
```

Extends Plan 13's `SearchRequestSchema`:

```ts
verifiedOnly: z.boolean().optional()
```

Filtering applies the same `VerifiedVehicle` expression as a `WHERE`
clause against the stored `registrationVerified`/`mileageConsistencyFlag`
columns — cheap, indexed, no live recomputation per search.

## 8. Out of scope for this plan

- VIN decode, outstanding finance, stolen-vehicle, and full write-off
  checks → deferred per §3, likely a Plan 34-funded future paid tier
- Full ID/KYC seller verification → deferred per §3
- Dealer-specific verification → explicitly **Plan 33**, per the
  functions doc's own line
- Report Listing / Report User / Blocked Users — a reactive, different
  kind of trust feature → **Plan 32** (this plan is the proactive/positive
  badge system; Plan 32 is the reactive reporting system)

## 9. Acceptance criteria

- [ ] A `Vehicle` created via a successful Plan 10 DVLA lookup has
      `registrationVerified = true`; one created via manual entry has
      `false`.
- [ ] A fixture MOT history with a decreasing odometer reading between
      two tests correctly sets `mileageConsistencyFlag = false`.
- [ ] `VerifiedVehicle` correctly reflects both underlying flags, and an
      admin-set `manualVerificationOverride` correctly takes precedence
      over the computed result.
- [ ] Phone OTP send/verify works end to end against a fixture SMS
      provider response; the 5/hour rate limit is enforced.
- [ ] `VerifiedSeller` requires both email and phone verification, not
      either alone.
- [ ] `verifiedOnly: true` in a search request returns only listings whose
      vehicle is currently `VerifiedVehicle`, verified against fixture
      data with a mix of verified and unverified vehicles.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm Twilio (or name a preferred SMS provider) for phone OTP, and
   whether phone verification should be **required** for all sellers or
   remain optional (badge-only incentive, not a gate on listing).
2. Confirm deferring the paid HPI-style vehicle history check entirely
   for V1, or is there appetite to integrate one now regardless of cost,
   given how central "trust" is to the product's positioning?
3. Confirm deferring full ID/KYC seller verification, or is there a
   specific trust bar (e.g. for high-value listings) you'd want it for
   sooner?
