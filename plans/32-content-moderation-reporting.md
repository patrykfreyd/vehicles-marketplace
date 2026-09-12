# Plan 32 — Content Moderation & Reporting

Status: Draft
Depends on: Plan 31 (this plan's queue is the consumer of Plan 31's
`FraudFlag` records — per that plan's explicit §3 decision), Plan 11
(`Listing`, extended with a `SUSPENDED` status), Plan 07 (`User`, banning
ties into session invalidation), Plan 25 (Messaging — blocking affects
message send), Plan 04 (admin queue UI, `ConfirmDialog` for destructive
actions)
Blocks: nothing structurally downstream

## 1. Objective

Build the reactive trust/safety half of the platform — the pages doc's
shared "Report Listing," "Report User," and "Blocked Users" pages — and,
as already decided in Plan 31 §3, the **single unified moderation queue**
that combines user-submitted reports with Plan 31's automated fraud
flags into one operational surface, rather than two separate admin
sections doing the same "review flagged things" job.

"Done" means: a buyer can report a listing or a user, that report lands
in the same queue as Plan 31's automated fraud flags with equal
visibility, a moderator can suspend a listing or ban a user with the
action fully audited, and blocking a user correctly prevents future
messages between the two parties.

## 2. Decisions carried over from the pages doc / Plan 31

- Shared pages: Report Listing, Report User, Blocked Users.
- **This plan is the consumer of Plan 31's `FraudFlag` records** — Plan
  31 deliberately builds no enforcement UI of its own; this plan's queue
  is where both automated flags and human reports get acted on.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Suspension mechanism | Add **`SUSPENDED`** to Plan 11's `ListingStatus` enum, rather than reusing `ARCHIVED` with a side flag | `ListingStatus` already drives every visibility rule in the product (Plan 11 §3) — a listing suspended by moderation needs to disappear from every public surface exactly like `ARCHIVED` does, but the seller needs to see a distinct "suspended, contact support" state rather than believing they archived it themselves. A first-class enum value keeps that distinction clean everywhere the status is already checked |
| Ban mechanism | `User.bannedAt` set, **plus an immediate call into Plan 07's session-invalidation** to revoke every active session for that user | A ban that doesn't immediately end existing sessions isn't really a ban — this is a small, necessary addition to Plan 07's auth service, not a new auth mechanism |
| Blocking's effect on messaging | Plan 25's message-send endpoint gets a small check: neither party in a `BlockedUser` relationship can message the other, in either direction | A block that only prevents new conversations but not messages within an existing one would be a weak version of the feature — blocking should be effective both ways |
| Blocking's effect on browsing | A blocked seller's listings are excluded from the **blocker's own** search/feed results only (not hidden from everyone) | A blocked relationship is one-directional and personal — it shouldn't affect what other buyers see of that seller |
| Report reasons | A fixed enum (`MISLEADING_LISTING`, `INAPPROPRIATE_CONTENT`, `SUSPECTED_SCAM`, `ALREADY_SOLD`, `SPAM`, `HARASSMENT`, `OTHER`) rather than free text only | Controlled values make the queue filterable/sortable by reason, consistent with this project's broader "controlled values over free text" convention (Plan 03 §3) — `OTHER` plus an optional detail text field covers anything the enum doesn't anticipate |
| Report abuse | A per-user daily report limit (proposed: 20/day) | Cheap guardrail against someone spamming false reports against a competitor |

## 4. Data model

```prisma
enum ReportEntityType { LISTING USER MESSAGE }
enum ReportReason {
  MISLEADING_LISTING INAPPROPRIATE_CONTENT SUSPECTED_SCAM
  ALREADY_SOLD SPAM HARASSMENT OTHER
}
enum ReportStatus { OPEN RESOLVED DISMISSED }
enum ModerationActionType { DISMISS WARN SUSPEND_LISTING BAN_USER }

model Report {
  id         String           @id
  reporterId String           @map("reporter_id")
  entityType ReportEntityType @map("entity_type")
  entityId   String           @map("entity_id")
  reason     ReportReason
  details    String?
  status     ReportStatus     @default(OPEN)
  createdAt  DateTime         @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([status])
  @@map("reports")
}

model BlockedUser {
  id            String   @id
  blockerId     String   @map("blocker_id")
  blockedUserId String   @map("blocked_user_id")
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([blockerId, blockedUserId])
  @@map("blocked_users")
}

model ModerationAction {
  id          String               @id
  moderatorId String               @map("moderator_id")
  entityType  ReportEntityType     @map("entity_type")
  entityId    String               @map("entity_id")
  action      ModerationActionType
  reason      String?
  createdAt   DateTime             @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@map("moderation_actions")
}
```

Extends Plan 11's `ListingStatus`:

```prisma
enum ListingStatus { DRAFT LIVE PAUSED RESERVED SOLD ARCHIVED SUSPENDED }
```

Extends Plan 07's `User`:

```prisma
model User {
  // ...existing fields
  bannedAt DateTime? @map("banned_at")
}
```

## 5. Moderation queue (`/admin/moderation`)

One unified list, each row sourced from either a `Report` or a Plan 31
`FraudFlag`, showing:

- The reported/flagged entity's content (listing summary, user profile,
  or message text) inline, so a moderator doesn't have to navigate away
  to see what's being reported.
- **Prior history** on that same entity — every previous `Report`,
  `FraudFlag`, and `ModerationAction` — so a moderator sees "this seller
  has 2 prior warnings" as context, not just the single item in front of
  them.
- Available actions (`Dismiss`, `Warn`, `Suspend Listing`, `Ban User`),
  each behind Plan 04's `ConfirmDialog` for the destructive ones (suspend,
  ban), and each recorded as a `ModerationAction` row.

`Warn` sends a notification via Plan 24's `NotificationsService`, using a
new `NotificationType.MODERATION_WARNING` (another small, sanctioned
extension of that plan's enum, same pattern used throughout this series).

## 6. Report / Block API

```text
POST /api/v1/reports              { entityType, entityId, reason, details? }
POST /api/v1/users/:id/block
DELETE /api/v1/users/:id/block
GET  /api/v1/users/me/blocked
```

Report/block submission uses Plan 04's standard form pattern (inline
validation on the reason selection, toast on submit success/failure).

## 7. Front-end additions to existing plans

- Plan 15's Vehicle Detail page and any seller-profile display gain a
  small "Report" action, opening the report modal.
- Plan 23's "My Adverts" list renders `SUSPENDED` listings distinctly from
  the seller's own `ARCHIVED` ones, with a "contact support" message
  rather than the normal archive UI.
- Plan 25's conversation list hides/disables messaging with a blocked
  user; a "Blocked Users" settings screen lists and allows unblocking.

## 8. Out of scope for this plan

- An appeals process for suspension/ban decisions — no idea doc describes
  one; flagged as a real gap worth a future decision (at minimum, a
  support-contact path) rather than built here
- Payment disputes/chargebacks — not applicable until Plan 34 introduces
  payments
- Any automated detection mechanism — that's entirely Plan 31's scope;
  this plan only consumes and acts on what Plan 31 produces

## 9. Acceptance criteria

- [ ] A submitted report and a Plan 31 fraud flag both appear in the same
      moderation queue, filterable by type/reason/severity.
- [ ] Suspending a listing sets `SUSPENDED` and hides it from every public
      surface (search, detail, discover) exactly like `ARCHIVED` does,
      while the seller's own "My Adverts" view shows it distinctly.
- [ ] Banning a user immediately invalidates their active sessions —
      verified by a previously-valid session token failing auth
      immediately after the ban.
- [ ] Blocking a user prevents messages in both directions and hides
      their listings from the blocker's own search results only.
- [ ] The queue's "prior history" panel correctly aggregates all past
      reports/flags/actions for a given entity.
- [ ] The 20/day report limit is enforced with a clear error.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm the report reason enum in §3 covers what you'd expect, or is
   there a category worth adding?
2. Is an appeals/support path for banned users worth scoping as a small
   follow-up now, or genuinely fine to leave as a manual support-email
   process indefinitely?
3. Confirm the 20 reports/day per-user limit.
