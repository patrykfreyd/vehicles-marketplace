# Plan 31 — Fraud Detection

Status: Draft
Depends on: Plan 12 (photo pipeline — perceptual hashing extends it),
Plan 22 (comparable-set/price logic reused for price-anomaly detection),
Plan 25 (message-send path — off-platform-contact detection extends it),
Plan 11 (`Vehicle`/`Listing`/`User`), Plan 30 (registration-verification
status as an input signal)
Blocks: nothing structurally downstream; Plan 32 (Moderation) is the
**consumer** of the flags this plan produces — see §3

## 1. Objective

Implement the behind-the-scenes fraud signals from
`idea/vehicle_marketplace_web_mobile_functions.md` §36: duplicate/stolen
photo detection, price-anomaly flagging, duplicate-registration
detection, suspicious-account heuristics (including the doc's specific
"potential dealers pretending to be private sellers" example), and
off-platform-contact detection in messages. Per the doc's own explicit
instruction — **"this does not need to be prominently branded as AI"** —
this plan is built almost entirely from deterministic, explainable rules
and thresholds, not opaque model scores, because an admin reviewing a
flag needs to understand exactly why it fired.

"Done" means: uploading a photo that's an exact match to another seller's
active listing's photo produces a real flag, a listing priced far below
its comparable market range is flagged as a scam-bait candidate, and a
message containing an off-platform contact attempt shows the sender a
gentle safety warning without blocking the message outright.

## 2. Decisions carried over from the functions doc

- Signals to detect: repeated/stolen photographs, suspiciously low
  prices, VIN/registration mismatches, multiple suspicious accounts,
  duplicate listings, suspicious messaging patterns, unusual location
  changes, dealers posing as private sellers.
- **Not prominently branded as AI** — it should just quietly work.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Mechanism | **Rule-based/statistical**, not LLM-scored, for every signal in this plan | Directly matches the doc's own instruction — deterministic thresholds are explainable to a human reviewer in a way a model confidence score isn't, and this project has consistently preferred deterministic computation wherever a real calculation exists (Plans 08/12/18/21/23/28/30) |
| Cross-plan vs. own enforcement | This plan **produces `FraudFlag` records only** — it does not build its own enforcement/action UI. **Plan 32's moderation queue is the single place staff review and act on flags**, whether user-reported or fraud-detected | Staff shouldn't have to check two separate admin sections to do "review flagged things" — one producer (this plan), one consumer/action surface (Plan 32), avoiding a duplicated admin workflow |
| Photo duplicate scope | Flag only **cross-seller** exact/near-duplicate matches (perceptual hash) — a seller reusing their own photos across their own re-listings is explicitly normal, not flagged | The doc's concern is stolen photos from someone else's real listing, not a seller legitimately relisting their own unsold car with the same pictures |
| VIN/registration mismatch | **Deferred alongside Plan 30 §3's Tier 2** — genuine VIN verification needs the same paid third-party data source Plan 30 already deferred; this plan implements only the free half (duplicate-registration-across-active-listings check, §5), not true VIN cross-checking | Honest about what's actually buildable without a paid data source, rather than a check that looks like VIN verification but isn't |
| Off-platform-contact detection | **Warn, don't block** — a soft, non-blocking notice to the sender ("for your safety, avoid sharing contact details before verifying the seller") plus a logged flag for review, not a rejected message | Regex/keyword detection of phone numbers, emails, "WhatsApp," etc. has real false-positive risk (a legitimate question can innocently mention a phone number); blocking would create real friction for genuine conversations, while a gentle warning plus a logged signal achieves the safety goal without breaking legitimate messaging |
| Device fingerprinting | **Not pursued in V1** — suspicious-account detection uses only IP-at-creation-time and simple volume thresholds | A proper device-fingerprinting service (e.g. Fingerprint.com) is a real paid, complex integration; the doc's own concrete example (dealer-posing-as-private-seller via listing volume) is achievable with much simpler signals |

## 4. Data model

```prisma
enum FraudFlagEntityType { LISTING USER MESSAGE }
enum FraudFlagType {
  DUPLICATE_PHOTO_SUSPECTED
  SUSPICIOUSLY_LOW_PRICE
  DUPLICATE_REGISTRATION
  DEALER_VOLUME_HEURISTIC
  SUSPECTED_OFFPLATFORM_CONTACT
  UNUSUAL_LOCATION_CHANGE
}
enum FraudFlagStatus { OPEN DISMISSED CONFIRMED }

model FraudFlag {
  id         String              @id
  entityType FraudFlagEntityType @map("entity_type")
  entityId   String              @map("entity_id")
  flagType   FraudFlagType       @map("flag_type")
  details    Json                                  // explainable, e.g. { matchedListingId, similarity }
  status     FraudFlagStatus     @default(OPEN)
  reviewedBy String?             @map("reviewed_by")
  reviewedAt DateTime?           @map("reviewed_at")
  createdAt  DateTime            @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([status])
  @@map("fraud_flags")
}

model PhotoHash {
  id        String @id
  mediaId   String @map("media_id")
  listingId String @map("listing_id")
  sellerId  String @map("seller_id")
  hash      String                     // perceptual hash (pHash/dHash)

  @@index([hash])
  @@map("photo_hashes")
}
```

`User.registrationIp` and `Listing.createdFromIp` are added (small,
justified extensions, same pattern used throughout this series) to
support the dealer-volume/shared-IP heuristic — a light PII consideration
worth flagging explicitly in open question 1.

## 5. Detection mechanisms

```text
DUPLICATE_PHOTO_SUSPECTED
  → extends Plan 12's existing Sharp pipeline: compute a perceptual hash
    per uploaded photo, check PhotoHash for a near-match (above a
    similarity threshold) on a DIFFERENT sellerId's active listing

SUSPICIOUSLY_LOW_PRICE
  → reuses Plan 22's comparable-set percentile calculation directly;
    flags when price falls meaningfully below the already-computed
    market range's low end (a stricter threshold than the "GREAT_PRICE"
    band, e.g. below 50% of median)

DUPLICATE_REGISTRATION
  → a direct query across Vehicle.registration for matches on other
    currently-LIVE/RESERVED listings — a check this plan owns precisely
    because Plan 11 §3 deliberately chose NOT to enforce registration
    uniqueness at the schema level (fresh Vehicle row per sell attempt);
    this is the active check that decision implied would be needed

DEALER_VOLUME_HEURISTIC
  → a PRIVATE-type seller (Plan 11's SellerType) with more than a
    threshold (proposed: 5) simultaneously active listings — the doc's
    own named example of "potential dealers pretending to be private
    sellers"

SUSPECTED_OFFPLATFORM_CONTACT
  → a regex/keyword scan on message send (small addition to Plan 25's
    existing send endpoint) for phone numbers, email addresses, and
    known off-platform terms ("whatsapp," "telegram," etc.) — non-
    blocking, per §3

UNUSUAL_LOCATION_CHANGE
  → a listing's lat/lng (Plan 13 §3) changing beyond a distance
    threshold after publish
```

## 6. Out of scope for this plan

- True VIN verification/decode → deferred alongside Plan 30's paid Tier 2
- Actual moderation actions (suspend listing, warn/ban account) →
  **Plan 32**, which consumes this plan's `FraudFlag` records
- Device fingerprinting → not pursued, per §3
- Any AI/LLM-scored fraud signal → deliberately excluded per §3, though
  not precluded as a future enhancement once the rule-based system's
  false-positive rate is well understood

## 7. Acceptance criteria

- [ ] Uploading an identical photo to two different sellers' active
      listings produces a `DUPLICATE_PHOTO_SUSPECTED` flag; the same
      seller uploading the identical photo to two of their own listings
      does not.
- [ ] A fixture listing priced well below its comparable market range
      produces a `SUSPICIOUSLY_LOW_PRICE` flag; a normally-priced one does
      not.
- [ ] The same registration appearing on two simultaneously-`LIVE`
      listings from different sellers produces `DUPLICATE_REGISTRATION`.
- [ ] A `PRIVATE` seller with 6 simultaneously active listings produces
      `DEALER_VOLUME_HEURISTIC`; one with 4 does not.
- [ ] A message containing a phone number triggers
      `SUSPECTED_OFFPLATFORM_CONTACT` and a non-blocking warning to the
      sender — the message still sends successfully.
- [ ] Every `FraudFlag.details` payload contains enough information for a
      human reviewer to understand why it fired without re-deriving it.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 8. Open questions for you

1. Capturing `registrationIp`/`createdFromIp` is a light PII collection
   point — comfortable with this given it's used only for fraud
   detection, or do you want a specific retention/access policy noted
   for it?
2. Confirm the 5-simultaneous-listing dealer-volume threshold, or would
   you like it tuned differently?
3. Confirm the warn-don't-block approach for off-platform-contact
   detection, given its false-positive risk.
