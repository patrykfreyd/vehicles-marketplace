# DriveHub — Development Plans Index

This document is the master list of development plans we need to write before
building any code. It does not contain implementation detail itself — each
row below becomes its own plan document later (`plans/NN-name.md`), written
just before we start that piece of work so it reflects what we've learned so
far.

Source material reviewed for this index (all in `idea/`):

- `low_cost_tech_stack_3_environments.md` — chosen stack + environment strategy
- `vehicle_database_catalogue_approach.md` — catalogue data model & workflow
- `vehicle_marketplace_pages.md` — full page/screen inventory (web + mobile)
- `vehicle_marketplace_web_mobile_functions.md` — product functionality spec
- `marketplace_analytics_user_engagement_tracking.md` — analytics/event model
- 4 mockup boards (ChatGPT images) — "DriveHub" branding, buyer web/mobile
  flows, seller web/mobile flows

## Product recap (one paragraph)

DriveHub is a two-sided (buyer/seller, one account type) vehicle marketplace
across **web (Next.js)** and **mobile (React Native/Expo)**, backed by a
single **NestJS modular monolith** on **PostgreSQL**, deployed as a low-cost
single-VPS-per-environment Docker setup (Local/Test/Production). It's
differentiated by an Instagram-style mobile Discover feed with direct
Exterior/Interior photo browsing, deep enthusiast-level specification search,
natural-language AI search, AI-assisted advert creation, and an AI Seller
Coach built on top of a first-class analytics/event pipeline.

## Cross-cutting UX requirements (apply to every plan below)

These came from you directly and are not optional per-feature — they belong
to the shared foundation (Plan 04) and every later plan that adds a form,
list, or async action must build on it rather than reinventing it:

1. **Inline, live form validation** — validate on change/keystroke (debounced
   where needed), errors render directly below the relevant input as the
   user types, not only on submit/blur. One shared pattern for web
   (React Hook Form + Zod) and mobile (same Zod schemas).
2. **Light and dark mode** — a theme toggle (plus system-preference default)
   backed by a shared design-tokens package, implemented consistently across
   Tailwind (web) and the RN styling layer (mobile).
3. **Toasts for all notifications/prompts** — transient system feedback
   (success/error/info, confirmations, background job results) surfaces as
   toast notifications, not blocking alert dialogs, on both platforms. This
   is distinct from the persistent in-app **Notification Centre** (price
   drops, new messages, etc. — see Plan 24), which is stored, unread-tracked
   data, not a toast.

---

## Phase 0 — Foundations (nothing else can start without these)

| # | Plan | Scope |
|---|------|-------|
| 01 | Monorepo & Tooling Setup | pnpm + Turborepo layout, `apps/`, `packages/`, lint/format/commit conventions, shared `tsconfig` |
| 02 | Environments & Infrastructure | Local/Test/Production Docker Compose setup, Caddy, env-var contract, secrets handling, deployment promotion flow |
| 03 | Shared Types & Validation Package | `packages/types`, `packages/validation` — Zod schemas as the single source of truth reused by API, web, mobile, catalogue tooling |
| 04 | Design System & Cross-Platform UI Foundations | Design tokens (color/spacing/type), light/dark theme implementation (web + mobile), the shared inline-validation form pattern, and the toast/notification-UI system for both platforms — **the plan that encodes the three cross-cutting requirements above** |
| 05 | Backend API Foundation | NestJS modular-monolith skeleton, module boundaries (per `low_cost_tech_stack`), global exception filter → consistent error shape for toasts/inline errors, OpenAPI/Swagger setup, generated TS API client |
| 06 | Database Schema & Migrations Baseline | Prisma schema for core entities (users, vehicles, listings, media, messages — excluding catalogue detail), migration workflow, seed scripts |
| 07 | Authentication & Authorization | Better Auth setup, single `User` model with buyer/seller capabilities, email/password + Google login, sessions, password reset/verification flows (inline-validated forms, toast feedback) |

## Phase 1 — Vehicle Catalogue

| # | Plan | Scope |
|---|------|-------|
| 08 | Catalogue Data Model & JSON Schema | Make→Model→Generation→Derivative hierarchy, controlled enums, aliases, completeness levels, `catalogue.schema.json` |
| 09 | Catalogue Import Tooling & Admin | CLI importer (validate/import/report/find-duplicates), internal Catalogue Admin UI, completeness scoring, AI-assisted enrichment workflow with review states |
| 10 | DVLA Vehicle Lookup & Seller Matching | Registration → DVLA lookup → candidate-derivative matching → seller confirmation, storing corrections to improve the matcher |

## Phase 2 — Core Marketplace (Vehicles, Listings, Search)

| # | Plan | Scope |
|---|------|-------|
| 11 | Vehicle & Listing Data Model | Physical-vehicle vs listing separation, statuses (draft/live/reserved/sold), history/equipment/modifications sub-entities |
| 12 | Image Upload & Processing Pipeline | Local storage abstraction (`StorageService`), Sharp resizing pipeline, BullMQ jobs, EXTERIOR/INTERIOR/etc. categorization, AI photo classification hook |
| 13 | Search & Filtering (Standard + Advanced) | Postgres full-text + `pg_trgm` + GIN indexes, standard filter set vs enthusiast/advanced filter set, saved searches |
| 14 | AI Natural-Language Search | Query → structured-filter pipeline, Zod-validated AI output, conversational refinement ("make it under £27k"), AI Car Finder ("help me choose") |

## Phase 3 — Buyer Experience

| # | Plan | Scope |
|---|------|-------|
| 15 | Vehicle Detail Page (Web + Mobile) | Exterior/Interior photo viewer with independent position memory, spec/equipment/performance/history/price-history tabs, AI vehicle summary + "Ask AI about this car" |
| 16 | Mobile Discover Feed | Full-screen swipeable feed, up/down = car, left/right = photo, preloading strategy, personalization signal capture (feeds Plan 27) |
| 17 | Saved Items: Likes, Watchlist, Collections | Cross-device sync, watchlist-triggered alerts (hooks into Plan 24) |
| 18 | Vehicle Comparison | Side-by-side spec comparison (web full, mobile simplified), AI Comparison verdicts |
| 19 | Web Research Section & Public/SEO Pages | Make→Model→Generation→Derivative research pages, homepage/landing pages, sitemap/SEO structure built on the catalogue |

## Phase 4 — Seller Experience

| # | Plan | Scope |
|---|------|-------|
| 20 | Advert Creation Wizard (Web + Mobile) | One wizard: Vehicle → Details → Photos → Advert → Price → Review → Publish; inline validation at every step; drafts |
| 21 | AI Advert Assistance | AI description/title generation, advert-completeness checker, AI cover-photo selection — with the "must never invent facts" grounding rule |
| 22 | Pricing Intelligence & Market Valuation | Comparable-based price banding ("Great Price" / market range), price-history tracking, what-if pricing simulator |
| 23 | Seller Dashboard, Advert Performance & AI Seller Coach | Funnel visualization (impressions→sold), Advert Score breakdown, AI Seller Coach recommendations, competitor intelligence |

## Phase 5 — Communication & Transactions

| # | Plan | Scope |
|---|------|-------|
| 24 | Notifications: Alerts, Notification Centre & Push | Persistent notification storage/read-state, buyer alerts (price drop, new match, high interest) and seller alerts, Expo push + email delivery — feeds toast system (Plan 04) for real-time in-session delivery only |
| 25 | Messaging System | Conversations/messages schema, WebSocket real-time delivery, attachments, quick-action templates, AI-assisted seller reply drafts |
| 26 | Viewing Requests & Offers | Scheduling flow, accept/suggest-alternative, reminders, post-viewing follow-up prompt |

## Phase 6 — Analytics & Personalization

| # | Plan | Scope |
|---|------|-------|
| 27 | Analytics Event Pipeline | `analytics_events` table, shared event-name package, ingestion endpoint, anonymous→registered identity stitching, first-touch/current attribution |
| 28 | Analytics Aggregation & Admin Reporting | BullMQ aggregation workers, daily aggregate tables (`listing_metrics_daily`, etc.), internal admin analytics dashboard |
| 29 | Personalization & Recommendations | User interest-profile derivation from events, "For You" ranking, similar-cars/recommendation surfaces, buyer intent scoring |

## Phase 7 — Trust, Dealers & Monetization

| # | Plan | Scope |
|---|------|-------|
| 30 | Trust & Verification | Verified-vehicle/verified-seller badges, VIN/registration checks, "verified only" filter |
| 31 | Fraud Detection | Duplicate/stolen-photo detection, price-anomaly and suspicious-account signals, private-seller-vs-dealer heuristics |
| 32 | Content Moderation & Reporting | Report listing/user, blocked users, moderation queue |
| 33 | Dealer Functionality | Dealer accounts, bulk upload/stock feed, staff/users, dealer-scale performance & pricing tools |
| 34 | Payments & Monetization | Packages/boosts, checkout, invoices — provider integration kept external per the low-cost stack principle |

## Phase 8 — Cross-Cutting Ops (can start early, finish late)

| # | Plan | Scope |
|---|------|-------|
| 35 | CI/CD & Deployment Pipeline | GitHub Actions → build → Test → manual-approve → Production, same-artifact promotion |
| 36 | Backup & Disaster Recovery | Nightly Postgres dumps + incremental media backup (restic/rclone), off-server destination, retention policy, restore drill |
| 37 | Testing & QA Strategy | Unit/integration/e2e split, contract tests for the shared API client, mobile device-matrix testing |
| 38 | Security & Privacy Compliance | Data minimization rules for analytics (already scoped in the analytics doc), consent handling, account/data deletion, secrets management |

---

## Suggested build order

Phases are numbered in the order they unblock the most subsequent work, but
0 → 1 → 2 must happen in sequence; 3, 4, 5 can run partly in parallel once
Phase 2 lands; 6 depends on events emitted throughout 3–5 so it should start
early (Plan 27) even though aggregation/personalization (28–29) land later;
7 and 8 are ongoing rather than one-shot.

```
0 Foundations
  └─ 1 Catalogue
       └─ 2 Core Marketplace (Vehicles/Listings/Search)
            ├─ 3 Buyer Experience
            ├─ 4 Seller Experience
            └─ 5 Communication & Transactions
                 └─ 6 Analytics & Personalization
                      └─ 7 Trust, Dealers & Monetization
8 Ops — threaded through every phase
```

## Next step

Confirm this list (add/remove/reorder anything), then we write Plan 01
first, since every other plan assumes the monorepo layout it defines.
