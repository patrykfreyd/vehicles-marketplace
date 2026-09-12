# Plan 34 — Payments & Monetization

Status: Draft
Depends on: Plan 11 (`Listing` — packages/boosts attach to it), Plan 20
(re-adds the Package/Promotion/Checkout wizard steps that plan explicitly
skipped for V1), Plan 13 (search ranking gets a small featured/boosted
tiebreak), Plan 33 (dealer billing), Plan 30 (this plan's generic purchase
mechanism is what a future paid vehicle-history-check add-on would plug
into)
Blocks: nothing structurally downstream

## 1. Objective

Build seller-facing monetization: Featured Listings, Boosts, and (if
pursued) a dealer subscription tier — via **Stripe**, kept fully external
per the low-cost-stack philosophy already applied to email and AI.

**Scope boundary worth stating plainly**: nothing in any idea doc
describes an in-platform buyer-facing checkout for actually purchasing a
vehicle (real cars require legal ownership transfer, financing,
inspection — not a "buy now" button). Every payment flow described
anywhere in the source material is **seller-side**: promotional packages,
boosts, dealer subscriptions. This plan builds only that.

"Done" means: a seller can purchase a Featured Listing package through
Stripe Checkout, the listing correctly gains boosted search ranking for
exactly the purchased duration and no longer, and payment confirmation is
driven by Stripe's webhook (the reliable source of truth), never by a
client-side redirect alone.

## 2. Decisions carried over from the pages doc / functions doc

- Seller wizard/dashboard references: Package/Promotion, Checkout,
  Promote/Boost, Boosts/Promotions, Payments, Invoices (pages doc, both
  web and mobile seller sections).
- Dealer dashboard includes Finance, Featured Listings, Boosts (functions
  doc §34).
- Plan 20 §3 explicitly deferred these wizard steps to this plan; Plan 30
  §3 explicitly deferred a paid vehicle-history-check funded through
  future payment infrastructure — both close here.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Payment provider | **Stripe** — Checkout for one-off package purchases, Billing/Subscriptions if a dealer monthly plan is pursued | Standard, well-documented, handles UK payment methods and PCI scope entirely off-platform — matches the "keep external, usage-based cost" principle already applied to email/AI |
| Payment confirmation source of truth | **Stripe webhook**, never the client-side checkout-success redirect alone | A redirect can be interrupted, manipulated, or simply not fire reliably; the webhook is the only trustworthy signal that money actually moved |
| Invoicing | **Reuse Stripe's built-in invoice/receipt generation** — this plan stores a reference to Stripe's hosted invoice, not a home-built PDF generator | Don't build what a well-integrated provider already gives you, same principle applied to Better Auth (Plan 07) and Resend (Plan 07) rather than self-hosting equivalents |
| VAT/tax handling | Recommend enabling **Stripe Tax**, but flagged as needing real accountant/legal sign-off, not asserted here as a settled decision | This is genuinely a compliance question a dev plan shouldn't unilaterally resolve — the *mechanism* (Stripe Tax) is a reasonable technical recommendation; whether/how to actually configure UK VAT is a business decision |
| Unifying mechanism | **One generic `PromotionPackage`/`Purchase` system** covering Featured Listings, Boosts, and (later) a purchasable vehicle-history-check add-on for Plan 30's deferred paid verification tier | Rather than building a separate one-off payment flow every time a new purchasable add-on is invented, this plan's mechanism is generic enough that Plan 30's future paid check just becomes a new `PackageType`, not a new payment integration |
| Exact pricing/duration | **Not decided by this plan** — package prices, boost durations, and whether a dealer subscription tier exists at all are real business decisions, placeholder values only | A dev plan can specify the *mechanism* correctly; it shouldn't invent your pricing strategy |

## 4. Data model

```prisma
enum PackageType { FEATURED_LISTING BOOST VEHICLE_HISTORY_CHECK }
enum PurchaseStatus { PENDING COMPLETED REFUNDED FAILED }

model PromotionPackage {
  id           String      @id
  type         PackageType
  name         String
  description  String?
  pricePence   Int         @map("price_pence")
  durationDays Int?        @map("duration_days")   // null for non-time-based packages (e.g. history check)
  active       Boolean     @default(true)

  @@map("promotion_packages")
}

model Purchase {
  id                    String         @id
  userId                String         @map("user_id")
  dealerId              String?        @map("dealer_id")
  listingId             String?        @map("listing_id")
  packageId             String         @map("package_id")
  package               PromotionPackage @relation(fields: [packageId], references: [id])
  amountPence           Int            @map("amount_pence")
  stripePaymentIntentId String         @unique @map("stripe_payment_intent_id")
  stripeInvoiceUrl      String?        @map("stripe_invoice_url")
  status                PurchaseStatus @default(PENDING)
  createdAt             DateTime       @default(now()) @map("created_at")

  @@map("purchases")
}

model DealerSubscription {
  id                   String   @id
  dealerId             String   @unique @map("dealer_id")
  stripeSubscriptionId String   @map("stripe_subscription_id")
  planId               String   @map("plan_id")
  status               String                        // mirrors Stripe's subscription status values
  currentPeriodEnd     DateTime @map("current_period_end")

  @@map("dealer_subscriptions")
}
```

Extends Plan 11's `Listing`:

```prisma
model Listing {
  // ...existing fields
  featuredUntil DateTime? @map("featured_until")
  boostedUntil  DateTime? @map("boosted_until")
}
```

## 5. Purchase flow

```text
Seller selects a PromotionPackage (wizard's Package step, or "Promote"
  action on an existing live listing)
        ↓
POST /api/v1/purchases  { packageId, listingId? }
        ↓
Server creates a Stripe Checkout Session, a Purchase{status: PENDING}
        ↓
Seller completes payment on Stripe's hosted page
        ↓
Stripe webhook → POST /api/v1/payments/webhook (signature-verified,
  idempotent by Stripe event ID — Stripe may retry delivery)
        ↓
On payment_intent.succeeded:
  Purchase.status = COMPLETED
  Apply the effect: Listing.featuredUntil / boostedUntil = now + durationDays
  (or, for a future VEHICLE_HISTORY_CHECK package, triggers Plan 30's
   deferred paid-check flow once that integration exists)
```

Idempotency is enforced by keying processed-event tracking on Stripe's
event ID — a redelivered webhook for an already-processed event is a
no-op, not a double-applied effect.

## 6. Search ranking integration (small addition to Plan 13)

```text
Plan 13's ORDER BY gains a tiebreak:
  featuredUntil > now  → surfaces higher
  boostedUntil > now   → secondary boost
  (both expire automatically — no cleanup job needed, just a live
   timestamp comparison in the query)
```

No new ranking system — a small, explicit addition to the existing query,
consistent with how every other cross-cutting feature in this project has
extended an existing query rather than building a parallel one.

## 7. Refunds

Admin-initiated only (via Plan 09/28's established `/admin` pattern):
calls Stripe's refund API, sets `Purchase.status = REFUNDED`, and reverses
the applied effect (clears `featuredUntil`/`boostedUntil` if still in the
future). No self-service buyer-initiated refund flow in V1 — these are
seller purchases of promotional placement, not consumer goods with a
statutory returns process.

## 8. Out of scope for this plan

- Any in-platform buyer-facing vehicle purchase/checkout → not a feature
  described anywhere in the source material, per §1
- The actual paid vehicle-history-check third-party integration →
  remains Plan 30's scope; this plan only provides the generic purchase
  mechanism it will plug into
- Complex dispute/chargeback handling → basic admin refund only, per §7
- Real package pricing/dealer subscription tiers → business decisions,
  not specified here

## 9. Acceptance criteria

- [ ] Purchasing a fixture Featured Listing package correctly creates a
      `PENDING` `Purchase`, and only the webhook confirmation (not the
      client redirect) flips it to `COMPLETED` and sets
      `Listing.featuredUntil`.
- [ ] A redelivered webhook for an already-processed Stripe event is
      correctly a no-op, not a double-applied effect.
- [ ] A featured listing correctly surfaces higher in Plan 13 search
      results while `featuredUntil` is in the future, and reverts to
      normal ranking automatically once it passes, with no cleanup job
      required.
- [ ] An admin-initiated refund correctly reverses both `Purchase.status`
      and the listing's featured/boosted effect.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. What packages, prices, and durations do you actually want for launch
   (e.g. "£X for 7-day Featured," "£Y for a 48-hour Boost")? This plan
   can't responsibly invent your pricing strategy.
2. Do you want a dealer monthly subscription tier at all for V1, or
   purely one-off package purchases to start?
3. Confirm pursuing Stripe Tax for VAT handling, or do you have existing
   accounting guidance that points to a different approach?
