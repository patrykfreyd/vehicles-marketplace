# Plan 26 — Viewing Requests & Offers

Status: Draft
Depends on: Plan 25 (`Conversation`, and the `Message.type` enum values
`OFFER`/`VIEWING_REQUEST` this plan finally uses), Plan 24
(`NotificationsService.notify()` — this plan extends its `NotificationType`
enum), Plan 11 (`Listing`), Plan 04 (date/time picker, `ConfirmDialog` for
accept/decline actions)
Blocks: nothing structurally downstream

## 1. Objective

Implement structured, in-conversation **Offers** and **Viewing Requests**
— `idea/vehicle_marketplace_web_mobile_functions.md` §29 and the pages
doc's dedicated Offer/Viewing screens: a buyer proposes a price or a
viewing time, the seller accepts, declines, or suggests one alternative,
both sides get reminders ahead of a confirmed viewing, and a post-viewing
prompt captures whether it actually happened.

"Done" means: an offer or viewing request renders as a real, interactive
card inline in the Plan 25 conversation thread (not a plain text message),
state transitions are correctly restricted to the right party, a
scheduled reminder fires ahead of a confirmed viewing time, and the
post-viewing follow-up correctly records a real outcome.

## 2. Decisions carried over from the functions doc

- Buyer proposes a viewing time ("Saturday · 11:00"); seller can
  **Accept** or **Suggest another time**; both sides receive reminders.
- After the viewing: "Did you view this vehicle?" — captured outcome
  data is explicitly framed as better marketplace conversion data than
  simply counting leads.
- "Make an offer" is a real, structured action (not a plain chat
  message), per the pages doc's dedicated Offer/Offer Details screens.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Negotiation depth | **One counter-level maximum** for both Offers and Viewing Requests — the seller may accept, decline, or counter/suggest-alternative once; if the buyer wants to negotiate further after that, they submit a **fresh** offer/request rather than the system supporting unlimited back-and-forth threading | Building a full negotiation state machine is real complexity this product doesn't need for V1 — a simple "one counter, then start fresh if needed" model covers the functions doc's actual described flow without it |
| Concurrent open offers | Creating a new `Offer` on a conversation **auto-withdraws** any existing `PENDING`/`COUNTERED` offer on that same conversation | Avoids an ambiguous state where two offers are simultaneously "awaiting response" on the same listing/buyer pair — there is always at most one live offer per conversation |
| Accepting an offer vs. listing status | Accepting an `Offer` **does not** automatically change `Listing.status` | An accepted offer isn't necessarily a completed sale (a viewing may still be pending); the seller marks the listing `RESERVED`/`SOLD` through Plan 11's existing status endpoint as a deliberate, separate action — decoupling avoids a surprising automatic state change |
| Reminders & follow-up scheduling | BullMQ **delayed jobs** (per-job `delay` computed from now to the target time) — 24h and 1h before a confirmed viewing; a follow-up prompt ~2h after the confirmed time | BullMQ's delay option is exactly suited to "fire once at a specific future time," unlike a repeatable/cron job |

## 4. Data model

```prisma
enum OfferStatus { PENDING ACCEPTED DECLINED COUNTERED WITHDRAWN }
enum ViewingStatus { PENDING ACCEPTED DECLINED RESCHEDULED }
enum ViewingOutcome { VIEWED NO_SHOW CANCELLED }

model Offer {
  id                 String      @id
  conversationId     String      @map("conversation_id")
  conversation       Conversation @relation(fields: [conversationId], references: [id])
  buyerId            String      @map("buyer_id")
  amountPence        Int         @map("amount_pence")
  counterAmountPence Int?        @map("counter_amount_pence")
  status             OfferStatus @default(PENDING)
  respondedAt        DateTime?   @map("responded_at")
  createdAt          DateTime    @default(now()) @map("created_at")

  @@map("offers")
}

model ViewingRequest {
  id             String        @id
  conversationId String        @map("conversation_id")
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  buyerId        String        @map("buyer_id")
  proposedAt     DateTime      @map("proposed_at")
  alternativeAt  DateTime?     @map("alternative_at")   // seller's one counter-suggestion
  confirmedAt    DateTime?     @map("confirmed_at")     // set once accepted, by either side
  status         ViewingStatus @default(PENDING)
  outcome        ViewingOutcome? 
  respondedAt    DateTime?     @map("responded_at")
  createdAt      DateTime      @default(now()) @map("created_at")

  @@map("viewing_requests")
}
```

Extends Plan 25's `Message`:

```prisma
enum MessageType { TEXT SYSTEM OFFER VIEWING_REQUEST }

model Message {
  // ...existing fields
  offerId          String? @map("offer_id")
  viewingRequestId String? @map("viewing_request_id")
}
```

Extends Plan 24's `NotificationType`:

```prisma
enum NotificationType {
  // ...existing values
  OFFER_RECEIVED OFFER_ACCEPTED OFFER_DECLINED OFFER_COUNTERED
  VIEWING_REQUESTED VIEWING_ACCEPTED VIEWING_ALTERNATIVE_SUGGESTED
  VIEWING_REMINDER VIEWING_FOLLOWUP
}
```

## 5. API

```text
POST /api/v1/conversations/:id/offers            { amountPence } → creates Offer + Message(type: OFFER), auto-withdraws prior open offer
POST /api/v1/offers/:id/accept                    seller only
POST /api/v1/offers/:id/decline                   seller only
POST /api/v1/offers/:id/counter                   { counterAmountPence } — seller only, rejected if already COUNTERED

POST /api/v1/conversations/:id/viewing-requests   { proposedAt } → creates ViewingRequest + Message(type: VIEWING_REQUEST)
POST /api/v1/viewing-requests/:id/accept          seller only, sets confirmedAt = proposedAt (or alternativeAt if that was accepted)
POST /api/v1/viewing-requests/:id/suggest-alternative   { alternativeAt } — seller only, rejected if already RESCHEDULED
POST /api/v1/viewing-requests/:id/accept-alternative    buyer only, confirms the seller's suggested time
POST /api/v1/viewing-requests/:id/outcome         { outcome } — buyer only, called from the post-viewing prompt

GET  /api/v1/viewings?role=buyer|seller           aggregated across all the caller's listings/conversations — powers "My Viewings" and the seller's "Viewing Calendar"
```

Every mutating route enforces the correct party per §2's roles (buyer
creates, seller responds, buyer confirms outcome), following Plan 07 §5's
explicit-check-per-endpoint rule.

## 6. Scheduled jobs

```text
On ViewingRequest confirmedAt being set:
  enqueue delayed job → confirmedAt minus 24h → VIEWING_REMINDER to both parties
  enqueue delayed job → confirmedAt minus 1h  → VIEWING_REMINDER to both parties
  enqueue delayed job → confirmedAt plus 2h   → VIEWING_FOLLOWUP prompt to buyer
```

All three go through `NotificationsService.notify()` (Plan 24) — this
plan doesn't build its own delivery mechanism, just schedules the calls.

## 7. Conversation thread rendering

Offers and viewing requests render as **interactive cards** inline in
Plan 25's message thread (using Plan 04's `Card`/`Button` components),
not plain text bubbles — e.g. an offer card shows the amount and, for the
seller, Accept/Decline/Counter buttons directly on the card; once
responded to, the card updates in place to show the resolved state
rather than posting a separate confirmation message.

## 8. Out of scope for this plan

- Payment processing for an accepted offer → **Plan 34**, if the product
  ever collects payment through the platform rather than leaving it to
  buyer/seller off-platform (not assumed either way by this plan)
- Deeper negotiation/counter-counter-offer threading → explicitly capped
  at one counter-level per §3
- Using viewing outcome data for broader conversion analytics → **Plan
  23/27** (this plan only captures the raw `outcome` field)

## 9. Acceptance criteria

- [ ] Making a second offer while one is `PENDING` correctly sets the
      first to `WITHDRAWN`.
- [ ] Attempting to counter an already-`COUNTERED` offer is rejected with
      a clear error; the buyer can still accept the existing counter.
- [ ] Accepting an offer never changes the associated `Listing.status` —
      verified directly against the database.
- [ ] Only the seller can accept/decline/counter an offer or viewing
      request; only the buyer can create one or confirm a viewing outcome
      — enforced and tested for both directions.
- [ ] Confirming a viewing time schedules exactly three delayed jobs (24h,
      1h, +2h) with correct target timestamps.
- [ ] The post-viewing follow-up correctly records `VIEWED`/`NO_SHOW`/
      `CANCELLED` against the right `ViewingRequest`.
- [ ] Offer and viewing-request cards render inline in the conversation
      thread and update in place once responded to, rather than as
      separate plain-text confirmation messages.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm the one-counter-level simplification for both Offers and
   Viewing Requests (§3) rather than deeper negotiation support.
2. Confirm accepting an offer should never auto-change listing status —
   or would you prefer accepting an offer to automatically mark the
   listing `RESERVED`?
3. Confirm the 24h/1h reminder and +2h follow-up timing, or would you
   like these tuned differently?
