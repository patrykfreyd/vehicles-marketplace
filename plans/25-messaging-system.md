# Plan 25 — Messaging System

Status: Draft
Depends on: Plan 06 (`Conversation`/`Message` stubs this plan extends),
Plan 11 (`Listing` — every conversation is scoped to one), Plan 24
(calls `NotificationsService.notify()` on a new message, using the exact
hook point that plan already defined), Plan 07 (session-authenticated
WebSocket connections), Plan 21 (AI-draft grounding pattern reused), Plan
04 (chat UI, toast on send failure)
Blocks: Plan 26 (Viewing Requests & Offers renders its structured events
inline in the same conversation thread this plan builds — see §3)

## 1. Objective

Build real buyer↔seller messaging —
`idea/vehicle_marketplace_web_mobile_functions.md` §28: text, photo
attachments, quick-action templates, and AI-assisted seller reply
drafts — with WebSocket real-time delivery when both parties are online
and push-notification fallback (via Plan 24) when they're not.

"Done" means: a buyer can message a seller about a specific listing in
real time, the seller sees a grounded AI-suggested reply they can edit or
ignore but which is **never sent automatically**, and a message sent while
the recipient is offline correctly triggers a push notification instead of
silently waiting.

## 2. Decisions carried over from the idea docs

- Every conversation is about **one specific listing** — "Message seller"
  always originates from a car, never a general inbox message.
- Support: text, photos, attachments, viewing arrangements, quick
  questions, offers.
- AI can help sellers **draft** answers using known advert information,
  but "the seller remains responsible for sending them" — this is a hard
  human-in-the-loop requirement, not a suggestion.
- Real-time via WebSockets (NestJS); mobile notifications via Expo Push
  (delivered through Plan 24, not duplicated here).

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Conversation model | **Simplified two-party** (`Conversation { listingId, buyerId, sellerId }`) rather than the stack doc's more generic `conversation_members` join table | No requirement anywhere in the idea docs needs group/multi-party conversations — every messaging scenario described is one buyer, one seller, about one car. A generic N-party membership table would be solving a problem this product doesn't have yet; simpler now, revisit only if dealer team inboxes (Plan 33) genuinely need multi-party threads later |
| One thread per buyer per listing | `@@unique([listingId, buyerId])` on `Conversation` | Starting "Message seller" a second time from the same listing should resume the existing thread, not create a duplicate one |
| Message extensibility | `Message.type` enum starting with just `TEXT`/`SYSTEM`, with `OFFER`/`VIEWING_REQUEST` **reserved for Plan 26 to add** | Offers and viewing requests are explicitly Plan 26's scope (not this plan's, despite both living "in" a conversation) — reserving the enum slot now means Plan 26 can render its structured events inline in this exact thread without this plan's schema needing to change later, the same reservation pattern used for `Media.isCoverPhoto` in Plan 12 |
| Real-time transport | **Socket.io** via `@nestjs/websockets`, authenticated using the same Better Auth session as REST | NestJS's most mature/documented gateway integration, with built-in per-conversation "room" support and reconnection handling out of the box |
| Attachments | Images only for V1, stored via Plan 12's existing `StorageService` but **without** the full async Sharp/BullMQ pipeline — a single synchronous resize (max dimension) on upload, since a chat attachment is one image, not a 20-photo advert batch | Reusing the storage abstraction (not reinventing it) while correctly recognizing that Plan 12's queue-based pipeline is built for a different scale of problem (batch advert photos) than "attach one photo to a chat message" |
| AI reply drafts | Populate the **compose box only** — the seller must explicitly hit Send, exactly like a manually-typed message, through the same send endpoint | Directly preserves the idea doc's explicit human-in-the-loop requirement; there is no "send AI reply" endpoint distinct from the normal one, which is what makes it structurally impossible for an AI-drafted message to go out unreviewed |

## 4. Data model

```prisma
enum MessageType { TEXT SYSTEM } // OFFER, VIEWING_REQUEST added by Plan 26

model Conversation {
  id         String   @id
  listingId  String   @map("listing_id")
  listing    Listing  @relation(fields: [listingId], references: [id])
  buyerId    String   @map("buyer_id")
  buyer      User     @relation("BuyerConversations", fields: [buyerId], references: [id])
  sellerId   String   @map("seller_id")
  seller     User     @relation("SellerConversations", fields: [sellerId], references: [id])
  createdAt  DateTime @default(now()) @map("created_at")

  messages Message[]

  @@unique([listingId, buyerId])
  @@map("conversations")
}

model Message {
  id             String       @id
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  senderId       String       @map("sender_id")
  sender         User         @relation(fields: [senderId], references: [id])
  type           MessageType  @default(TEXT)
  body           String
  readAt         DateTime?    @map("read_at")
  createdAt      DateTime     @default(now()) @map("created_at")

  attachments MessageAttachment[]

  @@index([conversationId, createdAt])
  @@map("messages")
}

model MessageAttachment {
  id        String  @id
  messageId String  @map("message_id")
  message   Message @relation(fields: [messageId], references: [id])
  path      String
  mimeType  String  @map("mime_type")

  @@map("message_attachments")
}
```

## 5. API & WebSocket events

```text
POST   /api/v1/conversations                  { listingId } → finds or creates, per §3's uniqueness rule
GET    /api/v1/conversations                   list for currentUser (as buyer or seller)
GET    /api/v1/conversations/:id/messages      paginated history
POST   /api/v1/conversations/:id/messages      { body, attachments? } → also marks delivered via WS if recipient connected
POST   /api/v1/conversations/:id/read          marks messages read
POST   /api/v1/conversations/:id/draft-reply   → { suggestedReply }, seller-only, grounded per §6
```

```text
WebSocket namespace: /conversations
  join room `conversation:<id>` on open, authenticated via session
  server → client: "message:new", "message:read", "typing"
  client → server: "typing" (ephemeral, not persisted)
```

If both participants aren't connected to the same room when a message is
sent, `NotificationsService.notify()` (Plan 24) is called for a
`NEW_ENQUIRY` (first message) or a generic new-message alert, per the
call-site pattern Plan 24 §5 already defined for this exact case.

## 6. AI-assisted reply drafts

```text
POST /api/v1/conversations/:id/draft-reply
  → builds context from the listing's real Vehicle/Derivative/Equipment
    data (same source Plan 21 uses) plus the buyer's actual message
  → single grounded Claude call (same provider/setup as Plan 14/15/21),
    instructed to answer using ONLY the supplied facts
  → { suggestedReply }
```

Rate-limited per user (proposed: 30 draft requests/day) since, like every
other AI call in this project, it costs real money. Uses the same
grounding test pattern as Plans 14/15/18/21/23: a fixture buyer question
about a feature the vehicle doesn't have must produce a reply that
doesn't claim it has that feature.

## 7. Quick-action templates

Client-side only — a fixed list of canned buyer messages ("Is this still
available?", "Can I arrange a viewing?", "Does it have full service
history?") inserted into the compose box on tap. No new backend concept:
these send through the exact same `POST .../messages` endpoint as any
typed message. "Make an offer" is deliberately **not** one of these quick
actions — it's Plan 26's structured `Offer` flow, not a plain text
message.

## 8. Out of scope for this plan

- Offers and viewing requests (both structured, stateful objects rendered
  inline in this conversation thread) → **Plan 26**, using the reserved
  `Message.type` values from §3
- Read receipts beyond a single per-message `readAt` (e.g. "seen at
  14:32" granularity, multi-device sync) — V1's single boolean-ish
  `readAt` is enough for the current UI
- Group/dealer-team conversations → deferred per §3, revisit only if
  Plan 33 needs it
- WebSocket cross-instance broadcast (a Redis adapter for socket.io) —
  not needed at single-API-instance scale (Plan 02 §36 Stage 7); flagged
  here as a documented future requirement if that stage is ever reached

## 9. Acceptance criteria

- [ ] Starting "Message seller" twice from the same listing as the same
      buyer resumes the same conversation, never creates a second one.
- [ ] A message sent while both parties are connected arrives via
      WebSocket in under a second in a local test; a message sent while
      the recipient is disconnected triggers Plan 24's notification path
      instead.
- [ ] An image attachment uploads, resizes synchronously, and displays
      correctly without going through Plan 12's async pipeline.
- [ ] `draft-reply` never suggests a reply claiming a feature/condition
      absent from the listing's real data (fixture-tested).
- [ ] The seller must explicitly send a drafted reply — no code path
      exists that sends an AI-drafted message without that explicit
      action.
- [ ] The 30/day draft-reply rate limit is enforced with a clear error.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm the simplified two-party `Conversation` model (§3) rather than
   the stack doc's more generic multi-member design — any near-term plan
   (e.g. dealer staff inboxes) that would need multi-party threads sooner
   than expected?
2. Confirm the 30 draft-replies/day per-user rate limit.
3. Confirm synchronous single-image resize for attachments is sufficient,
   or do you want attachment photos to go through the same categorized
   pipeline as advert photos (unlikely to be needed, but worth ruling
   out explicitly)?
