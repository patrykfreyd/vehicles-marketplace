# Plan 33 — Dealer Functionality

Status: Draft
Depends on: Plan 11 (`SellerType.DEALER`, extended here into a first-class
`Dealer` entity), Plan 20 (bulk upload reuses the underlying Vehicle/
Listing creation logic), Plan 23 (per-listing performance/Coach reused,
rolled up across a dealer's stock), Plan 25 (resolves that plan's §10
open question about multi-party access — see §3), Plan 09 (the
import-with-validation-report pattern reused for bulk upload)
Blocks: Plan 34 (Featured Listings/Boosts are dealer tools that are
explicitly payment features, built there)

## 1. Objective

Build dealer accounts as first-class multi-staff businesses —
`idea/vehicle_marketplace_web_mobile_functions.md` §34: inventory, bulk
upload, staff/users, dealer-scale performance and AI-driven stock
insights, and a public dealer profile with reviews (visible directly in
the mockups' "Prestige Motors · 4.8 (124 reviews)" card).

"Done" means: a dealer business can have multiple staff accounts sharing
access to the same stock and conversations, bulk-upload a spreadsheet of
vehicles with a clear per-row validation report, see an aggregated
performance rollup across their entire stock with AI-identified
underperformers, and display a verified, review-carrying public profile.

## 2. Decisions carried over from the functions doc

- Dealer dashboard: inventory, advert creation, bulk upload, stock feeds/
  API, leads, messages, performance, market comparison, pricing
  intelligence, staff/users, finance, featured listings, boosts, reviews,
  dealer profile.
- AI should identify underperforming/overpriced/missing-photo/high-demand
  vehicles across the dealer's whole stock, not just per-listing.
- "Dealer verification should be handled separately" (Plan 30's explicit
  deferral) — this is that separate handling.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Dealer as an entity | Introduce **`Dealer`** as a first-class business entity, distinct from `User`, with `DealerStaff` linking multiple `User`s to it by role. `Listing` gets both `sellerId` (the individual staff member who manages it day to day, for accountability) **and** `dealerId` (the business it belongs to, for stock/staff-access/branding) | A dealer isn't just "a `User` with `SellerType.DEALER`" (Plan 11's V1-simple flag) — it's an organization multiple people work within. The dual reference keeps individual accountability (who actually touched this listing) separate from organizational grouping (which business owns it) |
| Resolving Plan 25's open question | Plan 25 §10 asked whether dealer staff inboxes would need multi-party conversations sooner than expected. **Resolution: no schema change needed** — `Conversation.sellerId` stays a single ID (now potentially `dealerId`-linked via the listing), and **any staff member with `DealerStaff` access to that dealer can view/reply to its conversations**, via an authorization check, not a multi-party data model | Solves the real need (multiple people need access to one seller identity's conversations) at the authorization layer instead of redesigning Plan 25's deliberately simple two-party `Conversation` model — the simplification from Plan 25 §3 holds |
| Staff roles | Three tiers: **OWNER** (full control, billing, staff management), **MANAGER** (inventory/pricing, staff below manager level), **STAFF** (create/edit listings, respond to messages) — not a granular permission matrix | Sufficient for V1's actual described needs; a fine-grained permission system is complexity with no stated requirement behind it |
| Bulk upload vs. stock-feed API | Ship **CSV bulk upload** now, reusing Plan 09's exact "import → validate → report" pattern (row-level errors, not an all-or-nothing failure); **defer automated stock-feed/DMS integration entirely** | Stock-feed integration isn't a single standard — different Dealer Management System providers use different, often proprietary formats. It genuinely can't be specced without knowing which specific DMS providers real dealers use, unlike CSV upload which needs no external negotiation at all |
| Dealer verification | **Companies House API** (free, public, UK government) — verify a dealer's registered business name/number match | Continues this project's established pattern of using free government data sources where they exist (DVLA, DVSA, and now Companies House) rather than a paid KYB (know-your-business) provider |
| Dealer reviews | A **minimal** `Review` model (rating + comment, moderated via Plan 32's existing reporting mechanism for abuse) — flagged as genuinely new, previously-unowned scope, same honesty as Plan 19's minimal article model | The mockups explicitly show a review count/rating on the dealer profile card, but no plan in this index owns a review system — rather than silently building a full review platform or silently omitting a visibly-mocked feature, this plan adds the smallest version that satisfies it, confirmed with you in the open questions |

## 4. Data model

```prisma
enum DealerStaffRole { OWNER MANAGER STAFF }

model Dealer {
  id                String   @id
  businessName      String   @map("business_name")
  description       String?
  logoUrl           String?  @map("logo_url")
  companiesHouseNumber String? @map("companies_house_number")
  verifiedAt        DateTime? @map("verified_at")
  createdAt         DateTime @default(now()) @map("created_at")

  staff    DealerStaff[]
  listings Listing[]
  reviews  Review[]

  @@map("dealers")
}

model DealerStaff {
  id       String          @id
  dealerId String          @map("dealer_id")
  dealer   Dealer          @relation(fields: [dealerId], references: [id])
  userId   String          @map("user_id")
  role     DealerStaffRole
  joinedAt DateTime        @default(now()) @map("joined_at")

  @@unique([dealerId, userId])
  @@map("dealer_staff")
}

model Review {
  id         String   @id
  dealerId   String   @map("dealer_id")
  dealer     Dealer   @relation(fields: [dealerId], references: [id])
  reviewerId String   @map("reviewer_id")
  rating     Int                          // 1–5
  comment    String?
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("reviews")
}
```

Extends Plan 11's `Listing`:

```prisma
model Listing {
  // ...existing fields
  dealerId String? @map("dealer_id")
}
```

## 5. Bulk upload

```text
POST /api/v1/dealers/:id/bulk-upload   (multipart CSV)
  → per row: registration → Plan 10's DVLA lookup → Plan 11's Vehicle/
    Listing creation, same validation rules as the guided wizard
  → produces a report matching Plan 09's exact format:
    "47 rows — 42 created, 3 warnings, 2 errors" with row-level detail
  → runs as a BullMQ job (reusing the existing worker), not inline on
    the request, since a large spreadsheet could take a while
```

Every created listing gets `dealerId` set and starts as `DRAFT` — a
dealer still reviews and publishes each one (or a "publish all valid
rows" bulk action), rather than bulk-uploaded listings going live
unreviewed.

## 6. Dealer performance rollup

Reuses Plan 23's existing per-listing `ListingMetricsDaily`/Advert Score
directly — this plan adds an aggregation layer, not a new metrics system:

```text
GET /api/v1/dealers/:id/performance
  → total impressions/views/enquiries across all the dealer's listings
  → underperforming listings: bottom-quartile CTR within their own stock
  → overpriced listings: HIGH_PRICE assessment (Plan 22) among their stock
  → missing-photos listings: below-minimum coverage (Plan 12)
```

A dealer-level AI Coach call (same two-phase pattern as Plan 23's
per-listing Coach — real numbers computed first, AI only narrates and
prioritizes) summarizes the whole stock: "7 vehicles underperforming, 3
potentially overpriced, 4 missing important photographs" — the doc's own
example, now genuinely computable from real aggregated data.

## 7. Dealer profile & verification

Public profile page: business name, logo, verified badge (Companies
House match), review rating/count, live stock listing (reusing Plan 13's
search filtered by `dealerId`). Verification flow: dealer enters their
company number, this plan calls Companies House's API to confirm the
name/status match, sets `verifiedAt` on success.

## 8. Out of scope for this plan

- Automated stock-feed/DMS API integration → deferred per §3, needs its
  own scoping effort once specific dealer/DMS targets are known
- Featured listings, boosts, dealer billing/finance → **Plan 34**
- Fine-grained per-staff permissions beyond the three roles in §3
- A full review-moderation workflow beyond reusing Plan 32's existing
  report mechanism for abusive reviews

## 9. Acceptance criteria

- [ ] A dealer with three staff members (OWNER, MANAGER, STAFF) each
      correctly see and can act on the dealer's shared listings and
      conversations, with role-appropriate restrictions enforced (e.g.
      STAFF cannot invite new staff).
- [ ] Bulk-uploading a fixture CSV with 2 invalid rows correctly reports
      those 2 as errors while successfully creating the valid rows, per
      Plan 09's exact report format.
- [ ] The dealer performance rollup correctly identifies a fixture
      bottom-quartile-CTR listing as "underperforming" and a `HIGH_PRICE`
      listing as "potentially overpriced."
- [ ] Companies House verification correctly sets `verifiedAt` for a
      matching fixture company number and fails clearly for a mismatch.
- [ ] A submitted review appears on the dealer's public profile and can
      be reported/moderated through Plan 32's existing mechanism.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm building the minimal `Review` model (§3) now, given it's
   unowned elsewhere but visible in the mockups, versus dropping dealer
   reviews from V1 scope entirely.
2. Confirm the three-tier staff role model is sufficient, or is there a
   specific permission split you already know you'll need?
3. Confirm deferring stock-feed/DMS API integration — do you already have
   specific dealer partners/DMS systems in mind that would change this
   plan's priority?
