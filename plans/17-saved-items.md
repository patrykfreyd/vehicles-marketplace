# Plan 17 — Saved Items: Likes, Watchlist, Collections & Saved Searches

Status: Draft
Depends on: Plan 16 (`Like`/`Watchlist` base tables this plan extends),
Plan 13 (`SearchRequestSchema` — what a saved search persists), Plan 15
(listing summary data rendered in saved lists), Plan 04 (list views, empty
states, optimistic-update/toast pattern), Plan 07 (auth)
Blocks: Plan 24 (Buyer Alerts reads `Watchlist` and `SavedSearch` rows to
decide what to notify about), Plan 29 (Personalization reads Like/
Watchlist as explicit interest signals)

## 1. Objective

Build the complete "My Garage" / "Saved" experience —
`idea/vehicle_marketplace_web_mobile_functions.md` §3 and the pages doc's
explicit one-template guidance (Watchlist \| Likes \| Collections \| Saved
Searches \| Recently Viewed as tabs of one page, not five separate
screens): named Collections on top of Plan 16's Like/Watchlist tables,
persistent re-runnable Saved Searches, and Recently Viewed — all
synchronized automatically across web and mobile because they're
server-stored from the start.

"Done" means: a buyer can organize liked cars into named collections
("M340i," "Family cars"), save a search from Plan 13/14 and re-run it
later with one tap, see their recently viewed listings without needing
Plan 27's analytics pipeline to exist, and every one of these lists reads
identically on web and mobile.

## 2. Decisions carried over from the functions doc / pages doc

- Collections are user-named, arbitrary groupings ("My shortlist,"
  "Weekend cars," "Cars for Sarah") — not a fixed taxonomy.
- Saved content **synchronizes between web and mobile** automatically —
  achieved simply by these being server-stored resources scoped to the
  user, not a distinct sync mechanism to build.
- One "Saved"/"My Garage" page template with tabs — Watchlist, Likes,
  Collections, Saved Searches, Recently Viewed — not five separate routes.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Recently Viewed data source | A **dedicated, lightweight `RecentlyViewed` table** owned by this plan, updated directly from the Vehicle Detail page (Plan 15) — not derived from Plan 27's `analytics_events` | Recently Viewed is a core product feature needed at launch, not a business-intelligence report; making it depend on the (much later) analytics pipeline would be a forward dependency in the wrong direction. This mirrors Plan 11 §6's same reasoning for keeping `publishedAt`/`soldAt` on `Listing` directly rather than deriving them from analytics events |
| Saved-search re-run | A thin wrapper — `GET /saved-searches/:id/run` loads the stored filter payload and calls Plan 13's existing search service directly | No new search logic; a saved search is just a named, persisted `SearchRequestSchema` payload |
| Default notification state | New saved searches default to **notifications enabled** | Saving a search is itself a signal of ongoing interest — defaulting off would mean most buyers never discover the alert feature exists; easy to turn off per search |
| Abuse/scale limits | Cap **20 collections per user**, **200 items per collection**, **50 saved searches per user** | Cheap guardrails against accidental or malicious runaway growth; generous enough that no real user will hit them |

## 4. Data model

```prisma
model Collection {
  id        String   @id
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  name      String
  createdAt DateTime @default(now()) @map("created_at")

  items CollectionItem[]

  @@map("collections")
}

model CollectionItem {
  id           String     @id
  collectionId String     @map("collection_id")
  collection   Collection @relation(fields: [collectionId], references: [id])
  listingId    String     @map("listing_id")
  addedAt      DateTime   @default(now()) @map("added_at")

  @@unique([collectionId, listingId])
  @@map("collection_items")
}

model SavedSearch {
  id                  String    @id
  userId              String    @map("user_id")
  user                User      @relation(fields: [userId], references: [id])
  name                String
  filters             Json                          // validated against SearchRequestSchema on write
  notificationsEnabled Boolean  @default(true) @map("notifications_enabled")
  lastNotifiedAt      DateTime? @map("last_notified_at")   // set by Plan 24, read here for dedup
  createdAt           DateTime  @default(now()) @map("created_at")

  @@map("saved_searches")
}

model RecentlyViewed {
  id        String   @id
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  listingId String   @map("listing_id")
  viewedAt  DateTime @default(now()) @map("viewed_at")

  @@unique([userId, listingId])
  @@map("recently_viewed")
}
```

`RecentlyViewed` upserts `viewedAt` on repeat views rather than inserting
duplicate rows (the unique constraint on `[userId, listingId]` makes this
a single `upsert` call) — the list is always "most recently viewed,"
never "viewed most times."

## 5. API (`apps/api/src/modules/saved`)

```text
GET    /api/v1/saved/likes                    paginated listing summaries
GET    /api/v1/saved/watchlist
GET    /api/v1/saved/recently-viewed          most recent first, capped at 50 returned
POST   /api/v1/listings/:id/view              upsert into RecentlyViewed — called from Plan 15's detail page

POST   /api/v1/collections                    { name }
GET    /api/v1/collections
PATCH  /api/v1/collections/:id                rename
DELETE /api/v1/collections/:id
POST   /api/v1/collections/:id/items/:listingId
DELETE /api/v1/collections/:id/items/:listingId

POST   /api/v1/saved-searches                 { name, filters: SearchRequestSchema }
GET    /api/v1/saved-searches
PATCH  /api/v1/saved-searches/:id             rename / toggle notifications
DELETE /api/v1/saved-searches/:id
GET    /api/v1/saved-searches/:id/run         → delegates to Plan 13's search service
```

Every route is scoped strictly to `currentUser.id` — unlike listings
(semi-public by design), saved items are never visible to anyone but
their owner, with no exception for admins beyond ordinary support access
patterns.

## 6. Front-end behavior (Plan 04 patterns applied)

- Like/Watch buttons (already wired in Plan 16's feed) **optimistically**
  toggle their visual state immediately on tap, then reconcile with the
  server response; a failure reverts the optimistic state and shows a
  toast (Plan 04 §7) — the button never lies about a save that didn't
  actually happen.
- Empty states ("No liked cars yet," "No saved searches yet") use the
  `EmptyState` component from Plan 04 §8 — its first real usage in the
  product.
- Adding a listing to a collection is a small picker (existing collections
  + "Create new") rather than a separate full-page flow.

## 7. Out of scope for this plan

- Actually sending buyer alerts (new match, price drop, availability
  changes) based on `Watchlist`/`SavedSearch` data → **Plan 24** (this
  plan only shapes the data Plan 24 reads — including `lastNotifiedAt`,
  added specifically so Plan 24 doesn't need to alter this schema)
- Using Like/Watchlist signals to drive recommendations → **Plan 29**
- The feed UI these actions are triggered from → **Plan 16** (already
  built)

## 8. Acceptance criteria

- [ ] Liking a listing on mobile (Plan 16's feed) and opening Saved on
      web shows it immediately — proving true cross-device sync via
      shared server state, not a per-platform cache.
- [ ] Creating a collection, adding two listings to it, and removing one
      leaves exactly the expected item.
- [ ] Saving a search from Plan 13/14 and calling
      `GET /saved-searches/:id/run` returns results identical to running
      that same filter directly through Plan 13's search endpoint.
- [ ] Viewing the same listing twice updates `RecentlyViewed.viewedAt`
      rather than creating a duplicate row, and it correctly reorders to
      the top of the list.
- [ ] A failed like (simulated network error) reverts the optimistic UI
      state and shows a toast, never leaving the button in a state that
      doesn't match the server.
- [ ] The 20/200/50 limits from §3 are enforced with a clear, toast-ready
      error when exceeded.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 9. Open questions for you

1. Confirm the 20 collections / 200 items / 50 saved searches limits in
   §3, or would you like them tuned differently?
2. Confirm defaulting new saved searches to notifications **on** — or
   would you rather default to off and let buyers opt in explicitly?
3. Any reason `RecentlyViewed` should have a hard time-based expiry (e.g.
   auto-drop entries older than 90 days) rather than just capping how
   many are *returned*?
