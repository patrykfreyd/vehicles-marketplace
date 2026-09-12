# Plan 19 — Web Research Section & Public/SEO Pages

Status: Draft
Depends on: Plan 08/09 (catalogue hierarchy — only `APPROVED` derivatives
get public pages), Plan 13 (Search — "Cars for Sale" sections), Plan 15
(spec-rendering components reused for Performance/Dimensions/Equipment/
Engines sections), Plan 04 (design system)
Blocks: nothing structurally downstream — this is the SEO/organic-growth
surface named directly in `idea/marketplace_analytics_user_engagement_tracking.md`
§28 (its `HOME/SEARCH/MAKE/MODEL/GENERATION/DERIVATIVE/RESEARCH/LISTING/
DEALER` page-type taxonomy describes exactly the pages this plan builds)

## 1. Objective

Build the public marketing/landing pages and the **Research** knowledge
section — `idea/vehicle_marketplace_web_mobile_functions.md` §33:
`Makes → Models → Generations → Derivatives → Engines`, each with
Overview/Specs/Performance/Dimensions/Equipment/Engines/Reliability/
Running Costs/Market Prices/Cars-for-Sale sections — statically generated
from the catalogue for SEO, plus a deliberately minimal editorial/article
capability for "Car Reviews / Guides."

"Done" means: `/research/bmw/m4/g82/m4-competition-xdrive` renders a real
SEO-indexable page sourced entirely from Plan 08/09's catalogue data,
updates within seconds of an admin approving a spec correction, and a
sitemap correctly lists every publicly approved derivative page.

## 2. Decisions carried over from the idea docs

- Hierarchy: `Research → Make → Model → Generation → Derivative → Engine`,
  e.g. `BMW → 3 Series → G20 → M340i xDrive` (functions doc §33).
- Sections per catalogue entity page: Overview, Specs, Performance,
  Dimensions, Equipment, Engines, Reliability, Running Costs, Market
  Prices, Cars for Sale.
- This content is valuable to buyers **and** is explicitly a major SEO
  opportunity (functions doc §33, analytics doc §28) — pages must be
  fast, indexable, and correctly typed by page-type/catalogue-ID for
  later analytics reporting.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Rendering strategy | **Next.js ISR (static generation + on-demand revalidation)**, triggered by Plan 09's Catalogue Admin calling `revalidatePath` when a derivative is approved/edited — not a blind time-based revalidate | Gives fast, SEO-friendly static HTML most of the time, while corrections made in the Admin UI (Plan 09) go live within seconds rather than waiting for a revalidation window |
| Reliability / Common Problems content | Route through **the exact same draft/review/approve workflow Plan 09 already built** for catalogue data (new content tied to an engine family or derivative, starting `AI_DRAFT`, requiring human `SOURCE_CONFIRMED`/`APPROVED` status before ever appearing publicly) — with a **stricter bar** than ordinary spec fields: never show AI-drafted reliability claims, even flagged as draft, to the public | Incorrect claims about a specific engine's known failure modes carry real reputational/legal risk in a way an inaccurate 0–62 time doesn't — reusing Plan 09's existing review infrastructure (rather than inventing a parallel content system) while requiring the strictest state in that pipeline before publication |
| "Car Reviews / Guides" | A **deliberately minimal** article model (title, slug, markdown body, optional related make/model tags, `publishedAt`), admin-authored only, rendered via markdown — not a full CMS | The idea docs list this feature but no plan in this index owns any editorial/article system — rather than silently skipping it or silently building a large CMS, this plan adds the smallest version that satisfies the requirement, flagged for your confirmation since "build even a minimal CMS" is a meaningfully different kind of work than the catalogue-browsing pages this plan is otherwise just rendering |
| Structured data | Add `schema.org` JSON-LD (`Product`/`Vehicle` markup) to derivative and listing pages | Low-cost, standard SEO practice; directly supports the "large numbers of useful organic landing pages" goal the catalogue doc explicitly calls out |

## 4. URL structure

```text
/research
/research/bmw
/research/bmw/m4
/research/bmw/m4/g82
/research/bmw/m4/g82/m4-competition-xdrive

/buy
/sell
/ai-car-finder
/how-it-works
/pricing
/trust
```

Catalogue-hierarchy URLs map directly to Plan 08's slug IDs (`bmw`,
`bmw-m4`, `bmw-m4-g82`, `bmw-m4-g82-competition-xdrive`) — no separate
URL-slug field needed, the catalogue ID *is* the URL segment.

## 5. Page content sourcing

- **Overview/Specs/Performance/Dimensions/Equipment/Engines** — pulled
  directly from Plan 08's catalogue tables, rendered with the same spec-
  display components Plan 15 already built for the Vehicle Detail page
  (not reimplemented).
- **Market Prices** — simple descriptive statistics (min/median/max
  asking price) computed over current `LIVE`/`RESERVED` listings for that
  derivative — deliberately simpler than Plan 15's price-banding
  placeholder, since this is a market overview, not a judgment about one
  specific listing.
- **Cars for Sale** — a live Plan 13 search call filtered to the current
  page's `derivativeId` (or `generationId` at the generation level, etc.)
  — not a separate query mechanism.
- **Reliability** — per §3, only `SOURCE_CONFIRMED`/`APPROVED` content is
  ever rendered; a page with no approved reliability content simply omits
  that section rather than showing a placeholder that implies missing
  data is itself informative.
- Only `APPROVED` derivatives (Plan 09 §6's rule) generate a public page
  at all — requesting a non-approved derivative's URL returns 404, exactly
  matching the visibility rule already established for search and the
  detail page.

## 6. Article model (minimal, per §3)

```prisma
model Article {
  id            String    @id
  slug          String    @unique
  title         String
  bodyMarkdown  String    @db.Text
  relatedMakeId String?   @map("related_make_id")
  authorUserId  String    @map("author_user_id")
  publishedAt   DateTime? @map("published_at")   // null = draft
  createdAt     DateTime  @default(now()) @map("created_at")

  @@map("articles")
}
```

Write access gated by `isAdmin` (Plan 07); public read only where
`publishedAt` is set and in the past. No rich-text editor — authored as
plain markdown in a `<FormField>` textarea (Plan 04), rendered via a
standard markdown-to-HTML pipeline. This is intentionally the simplest
version of the feature the idea doc describes, not a content-management
platform.

## 7. SEO mechanics

- `generateMetadata` per page templated from catalogue data (title,
  description, canonical URL).
- A dynamic `sitemap.xml` route listing every `APPROVED` derivative page,
  every published `Article`, and every `LIVE`/`RESERVED` listing page.
- JSON-LD structured data on derivative and listing pages (§3).
- Page-type + catalogue-ID metadata attached to every rendered page in a
  form Plan 27's analytics can read off the page (matching the analytics
  doc §28 page-type taxonomy) — this plan renders that metadata; Plan 27
  owns actually recording it as an event.

## 8. Out of scope for this plan

- Actual marketing copy for the landing pages (Homepage, Buy Cars, Sell
  My Car, How It Works, Pricing) — this plan builds the routing/template
  shells using Plan 04's components; writing the real copy is a content
  task, not further engineering, same distinction Plan 09 drew for
  catalogue data population
- The Trust page's real verification badges → **Plan 30** (this plan
  ships the page shell with placeholder content)
- Recording page-view/SEO analytics events → **Plan 27**
- A full CMS (rich-text editing, scheduling, multi-author workflows,
  categories/tags beyond a single related-make field) — explicitly not
  built here; only the minimal article model in §6

## 9. Acceptance criteria

- [ ] The full BMW M4 fixture hierarchy (Plan 08's fixture) renders
      correctly at every level (`/research/bmw` through the G82
      Competition xDrive derivative page).
- [ ] Requesting a research URL for a non-`APPROVED` derivative returns
      404.
- [ ] Approving an edit to a derivative in Plan 09's Catalogue Admin
      updates the corresponding research page within seconds (verified
      via the ISR revalidation call, not a manual redeploy).
- [ ] A reliability note in `AI_DRAFT` or `REVIEW_REQUIRED` status never
      renders publicly; only `SOURCE_CONFIRMED`/`APPROVED` notes do.
- [ ] The "Cars for Sale" section on a derivative page returns the same
      results Plan 13's search would return for an equivalent direct
      query.
- [ ] `sitemap.xml` includes the fixture derivative's URL and excludes a
      non-approved one.
- [ ] An admin can publish a minimal article via markdown and it renders
      correctly at its slug with correct metadata.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 10. Open questions for you

1. Confirm building the minimal article model in §6 now, versus dropping
   "Car Reviews / Guides" from V1 scope entirely and revisiting it as a
   dedicated future plan if/when real content strategy needs it.
2. Confirm the stricter approval bar for reliability content (§3) — never
   shown even as a flagged draft — versus treating it like any other
   catalogue field.
3. Confirm on-demand ISR revalidation triggered from Plan 09's Admin
   rather than simpler time-based revalidation (e.g. every 6 hours) —
   worth the extra wiring for near-instant correction visibility?
