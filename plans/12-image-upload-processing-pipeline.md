# Plan 12 — Image Upload & Processing Pipeline

Status: Draft
Depends on: Plan 02 (`UPLOAD_ROOT`, `/data/uploads` layout, Redis), Plan
05 (worker process split — this is the first plan to actually register a
BullMQ queue), Plan 06 (`Media` stub), Plan 11 (`Listing` ownership rules
this plan's endpoints enforce), Plan 04 (upload UI, inline
validation/toasts)
Blocks: Plan 15 (Vehicle Detail's photo viewer needs the processed
variants), Plan 16 (Discover feed needs optimized images), Plan 20
(advert wizard's photo step calls this), Plan 21 (AI cover-photo
selection reads this plan's classified categories; advert-completeness
checker reads this plan's category-coverage signal)

## 1. Objective

Build the seller photo pipeline end to end: multipart upload → original
stored via a swappable `StorageService` → BullMQ job → Sharp resizing into
large/medium/thumbnail WebP variants → AI classification into the
Exterior/Interior/etc. taxonomy → a queryable per-listing photo-coverage
summary that powers the "Photo progress 7/10" / "AI tips" checklist shown
in the mockups. This is also the plan that gives `apps/worker` its first
real job to process, proving the process split from Plan 05 actually
works under load, not just in principle.

"Done" means: uploading a real photo (including a HEIC one from an
iPhone) results in a `Media` row that reaches `DONE` status with three
correctly-sized WebP variants and a classified category, visible through
a Photo Manager UI that lets the seller reorder, delete, and manually
recategorize any photo regardless of what the AI decided.

## 2. Decisions carried over from `idea/low_cost_tech_stack_3_environments.md`

- Storage: **local filesystem** under `/data/uploads/listings/<id>/...`
  in V1, behind a `StorageService` interface so a later move to S3 is a
  new implementation, not a rewrite.
- Variants: **Original, Large (~1600px), Medium (~900px), Thumbnail
  (~400px)**, encoded as **WebP** via **Sharp**, run in the **worker**
  process, never inline on the HTTP request.
- Image categories (stack doc §13): `EXTERIOR, INTERIOR, ENGINE, BOOT,
  DAMAGE, DOCUMENT, OTHER`.
- Never send the full original into the mobile Discover feed — the feed
  (Plan 16) uses `medium`/`thumbnail` variants only.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| HTTP upload stack | `@nestjs/platform-express` + `multer` (Nest's default HTTP adapter) | Plan 05 didn't fix an adapter choice; Express is Nest's default and multer is the standard multipart handler for it — flagged for confirmation since switching later (e.g. to Fastify) would touch this plan directly |
| HEIC handling | **Do not rely on Sharp's native HEIC decode.** Prefer the client (mobile picker, web file input) exporting JPEG where possible; run any HEIC that still arrives through `heic-convert` to JPEG **before** the Sharp pipeline | Sharp's HEIC support depends on a `libvips` build with `libheif`, which isn't reliably present in prebuilt binaries across environments due to HEIF's licensing situation — this is a real, easy-to-hit gap given how many sellers will upload straight from an iPhone, not a theoretical edge case |
| Real-time processing feedback | **Polling** — the client re-fetches the listing's media list every few seconds while any photo is `PROCESSING`, no WebSocket | Plan 25 (Messaging) is where real-time infra gets built; adding a WebSocket just for photo-processing status now would be a forward dependency in the wrong direction for a few seconds of perceived latency |
| Photo storage package | New `packages/storage`, exporting the `StorageService` interface and `LocalStorageService`, imported by both `api` (upload endpoint) and `worker` (variant writes) | One implementation, one seam, matching the stack doc's own interface exactly; a future `S3StorageService` (Plan 02 §36 Stage 2) drops in without touching calling code in either process |
| Upload limits | **20 MB per file**, JPEG/PNG/HEIC accepted client-side, **30 photos per listing** soft cap | 20MB matches the mockup's own stated limit ("Supports JPG, PNG, HEIC (max 20MB each)"); 30 is generously above the ~10-photo UI target to avoid feeling restrictive while still bounding worst-case storage abuse |
| AI classification confidence | Any classification always **overridable by the seller** in the Photo Manager UI, regardless of confidence; low-confidence results (below a threshold, e.g. 70%) default to `OTHER` and are flagged for the seller's attention rather than guessed into `EXTERIOR`/`INTERIOR` | The idea docs are explicit that AI must never silently misrepresent things it isn't sure about — same principle already applied to catalogue data in Plan 09, applied here to photo categorization |

## 4. `StorageService` (`packages/storage`)

```ts
export interface StorageService {
  upload(file: Buffer, path: string): Promise<{ path: string; url: string }>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export class LocalStorageService implements StorageService {
  // writes under UPLOAD_ROOT (Plan 02), returns a PUBLIC_UPLOAD_URL-relative URL
}
```

Layout on disk (already reserved by Plan 02 §4/stack doc §12):

```text
/data/uploads/listings/<listingId>/
├── original/<mediaId>.<ext>
├── large/<mediaId>.webp
├── medium/<mediaId>.webp
└── thumbnail/<mediaId>.webp
```

## 5. `Media` model — full definition (extends Plan 06's stub, per its §7 handoff)

```prisma
enum MediaCategory { EXTERIOR INTERIOR ENGINE BOOT DAMAGE DOCUMENT OTHER }
enum MediaStatus { PENDING PROCESSING DONE FAILED }

model Media {
  id           String        @id
  listingId    String        @map("listing_id")
  listing      Listing       @relation(fields: [listingId], references: [id])

  category         MediaCategory? // null until classified or manually set
  categoryConfidence Float?       @map("category_confidence")
  categorySource     EquipmentSource? @map("category_source") // reuse SELLER_DECLARED / AI_DETECTED from Plan 11

  status       MediaStatus   @default(PENDING)
  errorMessage String?       @map("error_message")

  originalPath  String @map("original_path")
  largePath     String? @map("large_path")
  mediumPath    String? @map("medium_path")
  thumbnailPath String? @map("thumbnail_path")

  position  Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([listingId, position])
  @@map("media")
}
```

`isCoverPhoto` is deliberately **not** added here — that flag belongs to
Plan 21, which owns AI cover-photo selection and will extend this model
when it's built, following the same cross-plan-extension pattern used
elsewhere (e.g. Plan 06 §7's Better Auth handoff).

## 6. Upload & processing flow

```text
Client (web/mobile)
  ↓ client-side check: type ∈ {jpeg, png, heic}, size ≤ 20MB (Plan 04 inline error if not)
POST /api/v1/listings/:id/media  (multipart, ownership-checked per Plan 11 §3)
  ↓ API: convert HEIC→JPEG via heic-convert if needed, store original via StorageService,
    create Media{status: PENDING}, enqueue BullMQ job {mediaId}
  ↓
Worker: image-processing queue consumer
  ↓ Media.status = PROCESSING
  ↓ Sharp: .rotate() (EXIF auto-orient) → resize to large/medium/thumbnail → .webp({quality: 82})
  ↓ store each variant via StorageService
  ↓ call VisionAiClient.classify(mediumVariant) → { category, confidence }
  ↓ Media.status = DONE, category/confidence set (or OTHER + flagged if confidence < 70%)
  ↓ on any failure: Media.status = FAILED, errorMessage set, BullMQ retries
    (3 attempts, exponential backoff) before requiring manual retry
```

`VisionAiClient` is a provider-agnostic interface (mirroring Plan 09's
`AiClient`) with one concrete implementation — the specific vision-capable
provider is not re-litigated here; it can share whatever provider Plan 09/
14 standardize on once that's settled.

## 7. API endpoints (`apps/api/src/modules/media`)

```text
POST   /api/v1/listings/:id/media           upload one photo (§6)
GET    /api/v1/listings/:id/media           list, ordered by position
PATCH  /api/v1/media/:id                    manual category override, per §3
PATCH  /api/v1/listings/:id/media/reorder   body: { mediaIds: string[] } — bulk position update
DELETE /api/v1/media/:id                    removes original + all variants from storage + DB row
POST   /api/v1/media/:id/retry              re-enqueues a FAILED job
GET    /api/v1/listings/:id/media/coverage  { exterior: 4, interior: 2, missing: ["BOOT","ENGINE"] }
```

`coverage` is this plan's concrete implementation of the mockup's "Photo
checklist" / "AI tips" feature (category counts + a simple recommended-
minimum table, e.g. ≥4 exterior, ≥2 interior) — Plan 21's broader advert-
completeness score consumes this endpoint as one input rather than
recomputing category coverage itself.

## 8. Front-end behavior (Plan 04 patterns applied)

- Drag-and-drop / file-picker component rejects wrong type or oversized
  files **before** any network call, with the error shown inline (Plan 04
  §6) next to the upload area — not a toast, since it's about what was
  selected, not a transient system event.
- A genuine upload/processing failure (network error, worker `FAILED`
  status) surfaces as a **toast** with a "Retry" action wired to
  `POST /media/:id/retry`.
- The Photo Manager (mockup: Exterior/Interior/Other tabs with drag
  reorder) lets the seller drag a photo between categories at any time —
  this always calls the manual-override `PATCH`, regardless of whether the
  photo currently shows an AI-assigned or seller-assigned category.

## 9. Out of scope for this plan

- AI cover-photo selection → **Plan 21**
- The overall advert-completeness score (mileage, service history, etc.,
  not just photos) → **Plan 21**
- Image preloading/caching strategy in the buyer-facing photo viewer →
  **Plan 15**/**Plan 16** (this plan just produces variants sized to make
  that practical)
- Moving storage to S3/object storage → future work per Plan 02 §36
  Stage 2, enabled but not triggered by this plan
- Disk-capacity monitoring/alerting → candidate for Plan 35/36, not built
  here

## 10. Acceptance criteria

- [ ] Uploading a JPEG, a PNG, and a HEIC test photo (from a real iPhone
      export, not a renamed JPEG) all reach `Media.status = DONE` with
      three correctly-sized WebP variants.
- [ ] An intentionally corrupted/oversized file is rejected client-side
      with an inline error before any request is sent.
- [ ] A photo classified with confidence below 70% is stored as `OTHER`
      and flagged, not guessed into a specific category.
- [ ] The seller can manually move any photo to a different category via
      `PATCH /media/:id` regardless of its current classification source.
- [ ] `GET /media/coverage` correctly reports missing categories against
      the recommended-minimum table for a listing with only exterior
      photos uploaded.
- [ ] Killing the worker mid-job and restarting it results in the job
      retrying (BullMQ's persistence in Redis), not silently lost.
- [ ] Deleting a `Media` row removes its files from `/data/uploads` (not
      just the DB row) — verified against Local's filesystem.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 11. Open questions for you

1. Confirm Express + multer (§3) as the HTTP upload stack — any reason to
   prefer Fastify at this stage that would change this plan's approach?
2. Confirm the 20MB/30-photo limits, or do you want them tuned differently
   for V1?
3. Confirm the `heic-convert` fallback approach for HEIC (§3) rather than
   building/self-compiling a HEIF-enabled Sharp binary — it's the lower-
   maintenance option but worth your sign-off since it's a real technical
   trade-off, not a style preference.
