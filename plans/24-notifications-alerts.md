# Plan 24 — Notifications: Alerts, Notification Centre & Push

Status: Draft
Depends on: Plan 17 (`Watchlist`, `SavedSearch` — this plan is the
consumer those fields were explicitly reserved for), Plan 11 (price-
change/sold transitions this plan hooks into), Plan 22 (comparable-set
logic reused for "new alternative" alerts), Plan 23 (`ListingMetricsDaily`/
`MarketSnapshotDaily` reused for anomaly-based alerts, and the AI Seller
Coach reused for the "no enquiry" reminder's content), Plan 07 (Resend
email already set up), Plan 04 (the toast/Notification-Centre boundary
this plan implements, already established in Plan 04 §7)
Blocks: nothing structurally downstream; Plan 25 (Messaging) calls into
this plan's shared service for the "new enquiry" alert once it exists

## 1. Objective

Build the persistent, unread-tracked **Notification Centre** plus the
buyer and seller alert triggers from
`idea/vehicle_marketplace_web_mobile_functions.md` §26–27, and Expo push +
email delivery for the alerts that warrant leaving the app. This plan's
central architectural deliverable is a shared `NotificationsService.notify()`
entry point — other modules (Plan 11, Plan 25) call into it rather than
this plan reaching into their tables, keeping trigger logic located next
to the event that causes it.

"Done" means: watching a listing and then seeing its price drop produces a
real notification (in-app, and push if the app is backgrounded), a seller
gets one daily digest rather than fourteen separate pings for fourteen
watchlist adds, and every notification type has a per-user, per-channel
setting the buyer/seller can actually turn off.

## 2. Decisions carried over from the functions doc / Plan 04

- Buyer alerts: New Match, Price Reduction, High Interest, New
  Alternative, Availability (sold).
- Seller alerts: New Watchlist (digest), Traffic Spike, No-Enquiry
  Reminder (with AI-identified improvements), Competitor Price Drop, New
  Enquiry.
- **"Notifications should remain useful rather than becoming spam"** —
  the functions doc's own explicit closing principle for this feature.
- The boundary already fixed in Plan 04 §7: this plan's stored,
  unread-tracked records are the Notification Centre; the toast system
  is separate, for transient in-session feedback only. A realtime event
  (e.g. a message arriving while the app is open) may fire **both** — a
  toast for the instant, and a stored row for the record — but they are
  not the same mechanism.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Architecture | A shared **`NotificationsService.notify(userId, type, payload)`** other modules call directly, rather than this plan polling other modules' tables from the outside | Price-drop and sold-status triggers naturally belong next to Plan 11's status-transition code (which already exists); having Plan 11 call `notify()` when it changes state is simpler and more reliable than this plan separately watching for those changes |
| New-match detection | A small `SavedSearchMatch` table (`savedSearchId`, `listingId`, `notifiedAt`) records which listings have already triggered a notification for a given saved search, checked by a periodic (e.g. every few hours) job that re-runs each `SavedSearch` (via Plan 17's existing search-re-run logic) and notifies only on genuinely new matches | Without this dedup table, a saved search would re-notify about the same matching listings on every poll — the table is cheap and makes "new" actually mean new |
| Anomaly-based alerts (High Interest, Traffic Spike) | Reuse **one shared anomaly check** (today's count vs. that listing's own trailing 7-day average, flagged when meaningfully above it) computed during Plan 23's existing nightly aggregation job — used for both the buyer-facing "unusually high interest" alert and the seller-facing "traffic is 3× higher" alert | Same underlying signal, two different audiences — one implementation, not two |
| No-Enquiry Reminder content | Directly calls **Plan 23's existing `/coach` endpoint** rather than generating separate advice text | The mockup's own wording ("AI has identified three improvements") is literally describing the Seller Coach's output — reusing it avoids a second AI-advice pathway saying possibly different things about the same listing |
| New-Enquiry trigger | Plan 25 (Messaging), built right after this plan, calls `NotificationsService.notify()` when a conversation's first message is sent — **this plan does not depend on Plan 25's tables**, it just defines the notification type and exposes the entry point Plan 25 calls | Keeps the dependency direction correct: the plan that knows *when* an enquiry happens (Messaging) is responsible for saying so, not this plan reaching backward into a not-yet-built module |
| Digest vs. real-time | Watchlist-add and traffic-spike alerts are **daily digests** (one notification summarizing the day), never one notification per individual event | Directly enforces the functions doc's own "remain useful, not spam" principle — a seller getting 14 separate "someone watchlisted your car" pings would be exactly the failure mode it warns against |
| Notification preferences | A dedicated `NotificationPreference` table, one row per `(userId, type)`, not a JSONB blob | Consistent with Plan 03/06's established rule that important, queryable dimensions are real columns, not buried in JSONB |
| Channel matrix | High-intent/actionable alerts (New Enquiry, Price Reduction, Availability) get **push + email + in-app**; digest/informational alerts (New Watchlist, Traffic Spike, Competitor Price Drop) get **push + in-app only**, no email | Avoids inbox fatigue for routine informational alerts while making sure genuinely actionable ones reach the user even if they're not in the app |

## 4. Data model

```prisma
enum NotificationType {
  NEW_MATCH PRICE_REDUCTION HIGH_INTEREST NEW_ALTERNATIVE AVAILABILITY_SOLD
  NEW_WATCHLIST_DIGEST TRAFFIC_SPIKE NO_ENQUIRY_REMINDER COMPETITOR_PRICE_DROP NEW_ENQUIRY
}

model Notification {
  id        String           @id
  userId    String           @map("user_id")
  type      NotificationType
  title     String
  body      String
  payload   Json?                              // { listingId, conversationId, ... } for deep-linking
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  @@index([userId, readAt])
  @@map("notifications")
}

model NotificationPreference {
  id           String           @id
  userId       String           @map("user_id")
  type         NotificationType
  pushEnabled  Boolean          @default(true) @map("push_enabled")
  emailEnabled Boolean          @default(true) @map("email_enabled")

  @@unique([userId, type])
  @@map("notification_preferences")
}

model SavedSearchMatch {
  id            String   @id
  savedSearchId String   @map("saved_search_id")
  listingId     String   @map("listing_id")
  notifiedAt    DateTime @default(now()) @map("notified_at")

  @@unique([savedSearchId, listingId])
  @@map("saved_search_matches")
}

model DeviceToken {
  id        String   @id
  userId    String   @map("user_id")
  token     String
  platform  String                      // "ios" | "android"
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, token])
  @@map("device_tokens")
}
```

## 5. `NotificationsService`

```ts
interface NotificationsService {
  notify(userId: string, type: NotificationType, title: string, body: string, payload?: object): Promise<void>;
}
```

`notify()`: writes the `Notification` row, checks `NotificationPreference`
for that user/type, and dispatches to Expo push (via stored
`DeviceToken`s) and/or Resend email per §3's channel matrix — one call
site, every delivery concern handled centrally so no other module has to
know about push tokens or email templates.

Call sites added to existing plans (small, explicit hooks, not rewrites):

```text
Plan 11's price-change code path      → notify() to every Watchlist holder
Plan 11's SOLD transition             → notify() to every Watchlist holder
Plan 11's publish (LIVE) transition   → checks for cheaper alternatives
                                          against Plan 22's comparable set,
                                          notifies relevant watchers
Plan 25's first-message-sent handler  → notify() to the listing's seller
```

## 6. Scheduled jobs (BullMQ repeatable jobs, reusing the existing worker)

```text
Every few hours:  re-run enabled SavedSearches, dedup via SavedSearchMatch,
                  notify on genuinely new matches
Nightly:          (piggybacks on Plan 23's existing aggregation job)
                  anomaly check → HIGH_INTEREST (buyer) / TRAFFIC_SPIKE (seller)
Daily:            watchlist-add digest per active listing
                  no-enquiry-reminder check (listings with 0 enquiries in 7+
                  days) → calls Plan 23's /coach endpoint for content
                  competitor-price-drop digest, from MarketSnapshotDaily diffs
```

## 7. Notification Centre UI

A standard list (Plan 04 components), unread count badge, mark-as-read on
open, each row's `payload` driving deep-link navigation to the relevant
listing/conversation. Notification Settings screen: one toggle row per
`NotificationType` × channel, backed directly by `NotificationPreference`.

## 8. Out of scope for this plan

- The messaging system itself → **Plan 25** (this plan only exposes the
  hook Plan 25 calls)
- Viewing-request reminders → **Plan 26**, follows the same call-`notify()`
  pattern once built
- SMS or any channel beyond push/email/in-app
- Sophisticated send-time optimization (e.g. "send at the time this user
  usually opens the app") — sent at a fixed daily/hourly cadence for V1

## 9. Acceptance criteria

- [ ] Reducing a fixture listing's price triggers a `PRICE_REDUCTION`
      notification to every user watching it, and only those users.
- [ ] Re-running the new-match job twice against an unchanged result set
      produces zero duplicate notifications (verified via
      `SavedSearchMatch`).
- [ ] A seller receiving 14 watchlist adds in one day gets exactly one
      digest notification, not 14.
- [ ] Disabling push (but not email) for `PRICE_REDUCTION` in
      `NotificationPreference` results in an email being sent but no push
      dispatch, verified against a fixture `DeviceToken`.
- [ ] The no-enquiry reminder's body text matches what Plan 23's `/coach`
      endpoint actually returned for that listing — not separately
      generated content.
- [ ] Opening the Notification Centre marks the opened notifications read
      and correctly decrements the unread badge.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm the channel matrix in §3 (push+email+in-app for high-intent
   alerts, push+in-app only for digests) or would you like it tuned
   differently?
2. Confirm daily digest timing (e.g. a fixed time like 9am local, or just
   "once per 24h from first event") — not critical for V1 correctness but
   worth a stated default.
3. Any cooldown period wanted on repeat "High Interest" alerts for the
   same listing (e.g. at most once per 7 days even if the anomaly
   persists daily), or should each detected anomaly always notify?
