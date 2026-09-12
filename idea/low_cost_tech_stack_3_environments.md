# Low-Cost Initial Tech Stack & Deployment Architecture

## 1. Objective

The initial platform should be designed around one principle:

> **Keep entry and deployment cost as low as possible while retaining a clean path to scale later.**

The first production version should be capable of running on a **single cheap Linux VPS** with:

- Web application
- Backend API
- PostgreSQL
- Redis
- Background jobs
- Vehicle image storage
- Catalogue data
- Seller analytics
- Authentication
- Reverse proxy / HTTPS

All hosted on the same server.

The mobile application will communicate with the same backend API.

The goal is to avoid unnecessary infrastructure cost and complexity during the MVP / early marketplace stage.

---

# 2. Recommended V1 Stack

## Language

```text
TypeScript
```

Use TypeScript across almost the entire platform.

This includes:

- Web
- Backend API
- Worker
- Catalogue tooling
- Validation
- Shared models
- API client
- AI integration

---

## Web

```text
Next.js
React
TypeScript
Tailwind CSS
React Hook Form
TanStack Query
Zod
```

The web application will support:

- Buyer experience
- Seller experience
- Vehicle search
- Vehicle detail pages
- Seller dashboard
- Advert creation
- Research pages
- Public SEO pages
- Authentication
- Messaging
- Saved vehicles

---

## Mobile

```text
React Native
Expo
Expo Router
TypeScript
TanStack Query
Zustand
React Native Reanimated
React Native Gesture Handler
FlashList
```

The mobile app will support both buyers and sellers.

Important buyer interactions include:

```text
Swipe up/down    → next / previous vehicle
Swipe left/right → next / previous photo
Exterior/Interior toggle
Like
Watch
Save
Message seller
```

The mobile application itself is not hosted on the server.

It communicates with the backend API.

Example:

```text
https://api.example.co.uk
```

---

## Backend

```text
NestJS
TypeScript
REST API
OpenAPI / Swagger
Zod
```

Use a **modular monolith**, not microservices.

Suggested modules:

```text
Auth
Users
Catalogue
Vehicles
Vehicle Lookup
Listings
Search
Favourites
Watchlists
Messaging
Seller Dashboard
Analytics
Notifications
AI
Payments
Moderation
Admin
```

Possible process separation:

```text
API
Worker
Scheduler
```

All can still use the same source code repository.

---


# 3. Environment Strategy

The platform will have **three environments**:

```text
LOCAL
TEST
PRODUCTION
```

The same application architecture and Docker-based deployment model should be used across all three environments wherever practical. Environment-specific behaviour should come from configuration and secrets rather than different code branches.

```text
Same monorepo
Same application code
Same database schema
Same migrations
Same Docker images/build process

            │
            ├── Local configuration
            ├── Test configuration
            └── Production configuration
```

Do not maintain separate `develop`, `test` and `production` versions of the application code. Use normal source control and promote tested commits/releases between environments.

## 3.1 Local Environment

The **Local** environment runs on the developer machine and is used for active development.

Recommended local stack:

```text
Next.js
NestJS API
Worker
PostgreSQL
Redis
Local file storage
Caddy optional
```

PostgreSQL and Redis should preferably run through Docker Compose so the development environment closely resembles Test and Production.

The web/API applications can either run in Docker or directly through Node.js during development for faster hot reload.

Example local URLs:

```text
http://localhost:3000       Web
http://localhost:3001       API
```

Local persistent data can live under a project-specific Docker volume or development data directory.

Local uploads must be completely separate from Test and Production uploads.

Use development/test catalogue data and seed scripts where useful.

Example:

```text
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The local environment may use fake/test integrations where practical. It must never accidentally connect to the Production database, Production Redis instance or Production file storage.

## 3.2 Test Environment

The **Test** environment is the shared deployed environment used to validate changes before Production.

It should run on its own inexpensive VPS or other isolated host.

Architecture:

```text
Test VPS
│
├── Caddy
├── Next.js
├── NestJS API
├── Worker
├── PostgreSQL
├── Redis
└── /data/uploads
```

Example domains:

```text
test.example.co.uk
api.test.example.co.uk
```

Test must have its own:

```text
PostgreSQL database
Redis data
Uploaded files
Authentication data
Environment variables
API credentials
AI configuration/keys where required
Email configuration
Logs
```

Never share the Production database or Production upload directory with Test.

Test should be sufficiently production-like to validate:

```text
Database migrations
Docker builds
Authentication
Vehicle lookup integrations
Catalogue imports
Image uploads and processing
AI workflows
Email workflows
Search
Seller advert creation
Mobile API compatibility
Deployment process
```

Where external providers support sandbox/test modes, use them in Test.

For email, either use a test/sandbox inbox or restrict recipients so Test cannot accidentally send real marketplace notifications to Production users.

Test data may be reset when required.

## 3.3 Production Environment

The **Production** environment contains live marketplace data.

Initial architecture:

```text
Production VPS
│
├── Caddy
├── Next.js
├── NestJS API
├── Worker
├── PostgreSQL
├── Redis
└── /data/uploads
```

Example domains:

```text
example.co.uk
api.example.co.uk
```

Production requires:

```text
Strong secrets
HTTPS
Persistent storage
Automated backups
Off-server backups
Database migration discipline
Restricted server access
Production logging
Disk monitoring
Basic uptime monitoring
```

Production data must never be copied into Local or Test casually. If production-derived data is ever required for debugging, personally identifiable/sensitive information should be removed or anonymised first.

## 3.4 Environment Configuration

Use environment variables for environment-specific configuration.

For example:

```text
NODE_ENV
APP_ENV

APP_URL
API_URL

DATABASE_URL
REDIS_URL

UPLOAD_ROOT
PUBLIC_UPLOAD_URL

AUTH_SECRET

EMAIL_API_KEY
EMAIL_FROM

AI_API_KEY

DVLA_API_KEY
```

Use an explicit application environment value:

```text
APP_ENV=local
APP_ENV=test
APP_ENV=production
```

Do not rely solely on `NODE_ENV` to distinguish Test from Production.

Suggested files for local development:

```text
.env.example
.env.local
```

Server secrets for Test and Production should be deployed securely and should **not** be committed to Git.

Commit `.env.example` containing the required variable names but no real secrets.

## 3.5 Separate Data Per Environment

Treat each environment as completely independent.

```text
LOCAL
├── Local DB
├── Local Redis
└── Local uploads

TEST
├── Test DB
├── Test Redis
└── Test uploads

PRODUCTION
├── Production DB
├── Production Redis
└── Production uploads
```

There should be no shared writable database or storage between environments.

## 3.6 Database Migrations

Use one Prisma migration history for all environments.

Development flow:

```text
Change Prisma schema
        ↓
Create migration locally
        ↓
Test migration locally
        ↓
Commit migration
        ↓
Deploy to Test
        ↓
Run migration on Test
        ↓
Validate
        ↓
Deploy same migration to Production
```

Do not manually alter the Production database schema outside the migration process except for genuine emergency recovery.

## 3.7 Catalogue Promotion

The vehicle catalogue should follow a similar promotion process.

```text
Catalogue JSON changed locally
        ↓
Validate JSON
        ↓
Import locally
        ↓
Review
        ↓
Commit approved catalogue changes
        ↓
Import into Test
        ↓
Validate marketplace/search behaviour
        ↓
Import same approved version into Production
```

Catalogue source JSON remains version controlled.

Environment-specific catalogue databases are generated/imported from the same approved catalogue source.

## 3.8 Deployment Promotion

Recommended release flow:

```text
Developer
   ↓
LOCAL
   ↓
Git commit / pull request
   ↓
TEST
   ↓
Validation
   ↓
PRODUCTION
```

Production should deploy the **same commit/build that passed Test** rather than rebuilding from unrelated source state.

A simple initial workflow can be:

```text
Push/merge
   ↓
Build Docker images
   ↓
Deploy to Test
   ↓
Test
   ↓
Manual Production approval
   ↓
Deploy same release to Production
```

Keep Production deployment manual/approved initially. Full automatic Production deployment is unnecessary at this stage.

## 3.9 Docker Compose Per Environment

Use a common Compose definition with environment-specific configuration rather than maintaining three unrelated architectures.

For example:

```text
docker-compose.yml
docker-compose.local.yml
docker-compose.test.yml
docker-compose.production.yml
```

or one main Compose file driven by environment files.

Conceptually:

```bash
docker compose --env-file .env.test up -d
```

and:

```bash
docker compose --env-file .env.production up -d
```

The exact mechanism can evolve, but the services should remain consistent.

## 3.10 Local vs Test vs Production Summary

| Area | Local | Test | Production |
|---|---|---|---|
| Purpose | Development | Pre-production validation | Live marketplace |
| Host | Developer machine | Cheap isolated VPS | Production VPS |
| PostgreSQL | Local | Dedicated Test DB | Dedicated Production DB |
| Redis | Local | Dedicated Test Redis | Dedicated Production Redis |
| Images | Local files | Test files | Live seller files |
| Catalogue | Development copy | Approved candidate | Approved live |
| AI | Dev key / limited | Test/limited | Production |
| Email | Fake/sandbox | Sandbox/restricted | Live transactional |
| HTTPS | Optional | Yes | Yes |
| Backups | Optional | Basic | Mandatory off-server |
| Data reset | Frequent | Allowed | Never routinely |
| Deployment | Developer controlled | Automated/manual | Approved release |
| Real users | No | Internal/test users | Yes |


# 4. One-Server Architecture

The initial Test and Production environments should each use the same simple single-server architecture. The Production version should look approximately like this:

```text
                         INTERNET
                             │
                             ▼
                        ┌─────────┐
                        │  Caddy  │
                        │  HTTPS  │
                        └────┬────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       ┌──────────────┐              ┌──────────────┐
       │   Next.js    │              │  NestJS API  │
       │     Web      │              │              │
       └──────────────┘              └──────┬───────┘
                                            │
                         ┌──────────────────┼──────────────┐
                         ▼                  ▼              ▼
                    PostgreSQL           Redis          Worker
                         │                  │              │
                         │                  └── BullMQ ─────┘
                         │
                         ▼
                    Catalogue
                    Vehicles
                    Listings
                    Users
                    Analytics

                          Local disk
                              │
                              ▼
                        /data/uploads
                       Vehicle photos
```

Everything except email delivery, AI API calls and off-site backup can initially run on one server.

---

# 5. Server

Recommended initial server:

```text
Ubuntu Server
4 vCPU
8 GB RAM
100–200 GB SSD
```

A smaller setup such as:

```text
2 vCPU
4 GB RAM
```

could work for development and early testing.

However, the following components will all share memory and CPU:

```text
Next.js
NestJS
PostgreSQL
Redis
Worker
Image processing
```

For that reason, **4 vCPU / 8 GB RAM** is a better starting point if the price difference is reasonable.

---

# 6. Docker Compose

Use Docker Compose from the beginning.

This keeps deployment simple and makes future migration easier.

Suggested services:

```text
web
api
worker
postgres
redis
caddy
```

Example structure:

```yaml
services:

  web:
    image: marketplace-web
    restart: unless-stopped
    depends_on:
      - api

  api:
    image: marketplace-api
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  worker:
    image: marketplace-api
    command: node dist/worker.js
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:17
    restart: unless-stopped
    volumes:
      - /data/postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  caddy:
    image: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
```

---

# 7. Reverse Proxy

Use:

```text
Caddy
```

instead of adding unnecessary complexity around HTTPS.

Example:

```text
example.co.uk {
    reverse_proxy web:3000
}

api.example.co.uk {
    reverse_proxy api:3001
}
```

Caddy provides automatic HTTPS certificate management.

This avoids initially needing to manage:

```text
Nginx SSL configuration
Certbot
Certificate renewal scripts
```

Nginx can still be used if preferred, but Caddy suits the simple/cheap deployment approach well.

---

# 8. PostgreSQL

Run PostgreSQL on the same VPS initially.

There is no need to pay separately for:

```text
AWS RDS
Supabase Pro
Cloud SQL
Managed PostgreSQL
```

during the early stage.

PostgreSQL should contain:

```text
Users
Catalogue
Vehicles
Listings
Watchlists
Favourites
Messages
Seller analytics
Searchable vehicle data
Vehicle history
Equipment
Colours
Advert data
```

Recommended tooling:

```text
PostgreSQL
Prisma
```

Application configuration should always use a database connection string.

Example:

```text
DATABASE_URL=postgresql://...
```

This makes it easy to later move PostgreSQL to a managed provider without redesigning the application.

---

# 9. ORM

Use:

```text
Prisma
```

Reasons:

- Excellent TypeScript integration
- Strong migrations
- Good developer experience
- Easy schema management
- Type-safe queries
- Works well with NestJS

---

# 10. Redis

Run Redis locally in Docker:

```text
redis:7-alpine
```

Use it initially for:

```text
BullMQ
Background jobs
Short-lived cache
Rate limiting
Temporary state if required
```

Redis has very low resource requirements for the early marketplace stage.

---

# 11. Background Jobs

Use:

```text
BullMQ
```

Typical jobs will include:

```text
Image processing
Thumbnail generation
AI advert generation
AI photo classification
Catalogue enrichment
Email requests
Push notification jobs
Seller analytics aggregation
Price-drop alerts
Search reindexing
Fraud checks
```

Example architecture:

```text
API request
    ↓
Queue job
    ↓
Redis / BullMQ
    ↓
Worker
    ↓
Process task
```

Do not make HTTP requests wait for expensive processing tasks.

---

# 12. Local Image Storage

For V1, store seller vehicle photos directly on the server.

Example:

```text
/data/uploads/
```

Recommended layout:

```text
/data/uploads/listings/
    └── <listing-id>/
        ├── original/
        │   ├── 001.jpg
        │   ├── 002.jpg
        │   └── 003.jpg
        │
        ├── large/
        │   ├── 001.webp
        │   └── ...
        │
        ├── medium/
        │   └── ...
        │
        └── thumbnail/
            └── ...
```

Do not store images directly inside PostgreSQL.

The database should store only metadata and file locations.

Example:

```json
{
  "id": "img_123",
  "listing_id": "lst_456",
  "type": "EXTERIOR",
  "position": 1,
  "original_path": "/uploads/listings/0193819238/original/001.jpg",
  "large_path": "/uploads/listings/0193819238/large/001.webp",
  "medium_path": "/uploads/listings/0193819238/medium/001.webp"
}
```

---

# 13. Image Categories

Store an image type.

Recommended values:

```text
EXTERIOR
INTERIOR
ENGINE
BOOT
DAMAGE
DOCUMENT
OTHER
```

This supports the planned vehicle-photo experience:

```text
Exterior
Interior
```

with direct photo navigation.

AI can later automatically classify uploaded seller images.

---

# 14. Image Processing

Use:

```text
Sharp
```

in the Node.js worker.

Seller uploads one large source image.

The worker generates optimised versions.

Example:

```text
Original
Large       ~1600 px
Medium      ~900 px
Thumbnail   ~400 px
```

Prefer modern formats such as:

```text
WebP
AVIF
```

where practical.

Example:

```ts
await sharp(input)
  .resize({
    width: 1600,
    withoutEnlargement: true
  })
  .webp({
    quality: 82
  })
  .toFile(output);
```

Do not send the full original image into the mobile Discover feed.

---

# 15. Storage Abstraction

Even though files are stored locally initially, the application should not directly depend on local filesystem logic everywhere.

Create a storage abstraction.

Example:

```ts
interface StorageService {
  upload(file: Buffer, path: string): Promise<StoredFile>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
```

V1:

```text
LocalStorageService
```

Later:

```text
S3StorageService
```

This allows storage to move later without redesigning the rest of the platform.

---

# 16. Disk Capacity

Vehicle images will likely become the first major storage constraint.

Example rough calculation:

```text
20 optimised images per advert
×
approximately 1 MB each
=
approximately 20 MB per advert
```

Example scale:

```text
1,000 adverts   ≈ 20 GB
5,000 adverts   ≈ 100 GB
10,000 adverts  ≈ 200 GB
```

Actual values will depend on image compression, image counts and whether originals are retained.

This should be monitored from the start.

---

# 17. Search

Do not install a dedicated search cluster for V1.

Use PostgreSQL.

Useful PostgreSQL capabilities include:

```text
Normal indexes
GIN indexes
Full-text search
pg_trgm
JSONB where useful
```

Enable:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This can support searches such as:

```text
M4 Comp
G82
S58
Marina Bay
MBB
```

combined with structured filters such as:

```text
Price
Mileage
Power
Transmission
Fuel
Drivetrain
Colour
Generation
Derivative
Equipment
```

A separate search engine can be introduced later if required.

Possible future option:

```text
Meilisearch
```

or at larger scale:

```text
OpenSearch
Elasticsearch
```

But not initially.

---

# 18. Authentication

Avoid paying for Clerk/Auth0 initially if keeping fixed cost minimal.

Use a self-hosted authentication solution such as:

```text
Better Auth
```

with PostgreSQL.

Initial authentication requirements:

```text
Email/password
Email verification
Password reset
Google login
Sessions
```

Later:

```text
Apple login
MFA
Additional providers
```

The platform should have one user account.

Do not create separate buyer and seller accounts.

Example:

```text
User
├── Buyer behaviour
├── Seller profile
└── Dealer membership where applicable
```

---

# 19. Email

Email is one area that should remain external.

Do not self-host SMTP initially.

Reasons:

```text
Deliverability
Spam reputation
DNS complexity
IP reputation
Maintenance
```

Use an external transactional email provider for:

```text
Email verification
Password reset
New enquiry alert
New message alert
Price-drop alert
Viewing confirmation
```

Usage will initially be low, so cost should be very small or potentially covered by a free tier.

---

# 20. AI

Keep AI external initially.

The server should call an AI API only when required.

Potential uses:

```text
Natural-language vehicle search
Advert writing
Seller Coach
Catalogue enrichment
Photo classification
Vehicle summaries
AI vehicle comparison
```

Do not attempt to host a large language model on the marketplace VPS.

This would significantly increase hardware requirements.

AI cost should scale with actual marketplace use instead of becoming a large fixed infrastructure cost.

---

# 21. AI Search

Natural-language search should convert user intent into structured filters.

Example user query:

```text
Find me a blue G82 M4 xDrive under £60k with carbon buckets
```

AI output:

```json
{
  "make": ["BMW"],
  "model": ["M4"],
  "generation": ["G82"],
  "drivetrain": ["AWD"],
  "max_price": 60000,
  "colour_family": ["BLUE"],
  "equipment": [
    "carbon_bucket_seats"
  ]
}
```

Then:

```text
AI
 ↓
Structured validated filters
 ↓
Normal search service
 ↓
PostgreSQL
```

Do not allow the language model to directly construct arbitrary production database queries.

Validate AI output with Zod.

---

# 22. Seller Analytics

Do not pay for a separate analytics platform initially.

The seller dashboard needs marketplace analytics anyway.

Store important listing events directly.

Example table:

```text
listing_events
```

Suggested events:

```text
SEARCH_IMPRESSION
FEED_IMPRESSION
LISTING_VIEW
PHOTO_VIEW
LIKE
WATCHLIST_ADD
MESSAGE_STARTED
VIEWING_REQUESTED
PRICE_CHANGED
LISTING_SOLD
```

Then create daily aggregates:

```text
listing_metrics_daily
```

Example:

```text
listing_id
date
search_impressions
feed_impressions
views
likes
watchlists
messages
viewing_requests
```

This supports the seller funnel:

```text
14,821 impressions
1,382 advert views
67 likes
31 watchlists
14 enquiries
4 viewing requests
```

A service such as PostHog can be introduced later for deeper product analytics.

---

# 23. Messaging

Initially use PostgreSQL for conversation storage.

Tables could include:

```text
conversations
conversation_members
messages
```

Real-time messaging can use:

```text
WebSockets
```

via NestJS.

Mobile notifications can use:

```text
Expo Push Notifications
```

Later add:

```text
Read receipts
Typing indicators
Attachments
Offer events
Viewing events
```

---

# 24. Catalogue

The vehicle catalogue remains based on the previously defined approach:

```text
JSON staging
+
PostgreSQL production catalogue
```

Suggested repository:

```text
catalogue/
├── schema/
├── shared/
├── bmw/
├── audi/
├── mercedes/
├── volkswagen/
└── ...
```

Catalogue tooling should also be TypeScript-based.

Example commands:

```text
pnpm catalogue validate bmw/m4.json
pnpm catalogue import bmw
pnpm catalogue report bmw
pnpm catalogue completeness
pnpm catalogue find-duplicates
```

Use:

```text
Node.js
TypeScript
Zod
Prisma
```

This keeps catalogue tooling aligned with the rest of the platform.

---

# 25. Monorepo Structure

Recommended repository:

```text
marketplace/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── api/
│   ├── worker/
│   └── catalogue-cli/
│
├── packages/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── catalogue-types/
│   ├── search-types/
│   ├── design-tokens/
│   ├── ai-types/
│   ├── config/
│   └── utils/
│
├── catalogue/
│   ├── bmw/
│   ├── audi/
│   ├── mercedes/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docker/
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Recommended workspace tooling:

```text
pnpm
Turborepo
```

---

# 26. Shared Types

Use shared TypeScript schemas across applications.

Example:

```ts
export const DrivetrainSchema = z.enum([
  "FWD",
  "RWD",
  "AWD"
]);

export type Drivetrain =
  z.infer<typeof DrivetrainSchema>;
```

Reuse these definitions in:

```text
NestJS
Next.js
React Native
Catalogue importer
Admin
AI structured outputs
```

This reduces inconsistencies.

---

# 27. Validation

Use:

```text
Zod
```

at application boundaries.

Examples:

```text
API requests
API responses
Forms
Catalogue imports
AI output
Background jobs
Configuration
```

The same validation types can often be shared across the monorepo.

---

# 28. API

Use:

```text
REST
NestJS
OpenAPI / Swagger
```

Example routes:

```text
GET /api/cars
GET /api/cars/:id

GET /api/catalogue/makes
GET /api/catalogue/models
GET /api/catalogue/generations
GET /api/catalogue/derivatives

POST /api/listings
PATCH /api/listings/:id

POST /api/search

POST /api/ai/search
```

Generate a TypeScript API client where practical.

This client can then be shared by:

```text
Web
Mobile
Internal admin
```

---

# 29. Data Directory Structure

Keep persistent server data organised and isolated by environment.

On each deployed server, use the same logical layout. Because Test and Production are on separate hosts, each `/data` tree belongs only to that environment.

Example:


```text
/data/
├── postgres/
├── uploads/
├── backups/
└── catalogue/
```

Avoid depending on anonymous Docker volumes for important production data.

Explicit directories make:

```text
Backup
Migration
Server replacement
Disk monitoring
Recovery
```

much easier.

---

# 30. Backups

The production system may run on one cheap server.

The backup must **not** exist only on that same server.

If the server fails and contains:

```text
Database
+
Seller photos
```

then the marketplace could otherwise lose everything.

Recommended strategy:

```text
Nightly PostgreSQL backup
+
Incremental media backup
        ↓
Off-server destination
```

Possible backup destinations:

```text
Cheap object storage
Second server
NAS
Remote backup provider
```

This is one area worth spending a small amount of money on from the beginning.

---

# 31. PostgreSQL Backup

Example:

```bash
pg_dump -Fc marketplace > marketplace-2026-09-12.dump
```

Automate this.

Suggested retention:

```text
7 daily backups
4 weekly backups
6 monthly backups
```

---

# 32. Image Backup

Use:

```text
restic
```

or:

```text
rclone
```

for incremental media backup.

Only changed/new image data should need to be transferred after the initial backup.

---

# 33. Deployment

Avoid unnecessary deployment complexity.

Initial deployment can be:

```text
GitHub
   │
   ▼
GitHub Actions
   │
   ▼
SSH to production server
   │
   ▼
docker compose build/pull
docker compose up -d
```

During very early development, even this is acceptable:

```bash
git pull
docker compose build
docker compose up -d
```

More advanced deployment can be introduced when there are multiple developers, multiple environments or higher uptime requirements.

---

# 34. What Not to Use Initially

To keep fixed costs and operational complexity low, deliberately avoid initially:

```text
AWS platform architecture
RDS
S3
Vercel
Supabase paid infrastructure
Firebase-heavy architecture
Clerk
Auth0
Elasticsearch
OpenSearch
Meilisearch
PostHog
Kafka
Kubernetes
Service mesh
Microservices
Managed Redis
Separate analytics database
```

These technologies may become valuable later.

They are simply not necessary to validate the marketplace.

---

# 35. Initial External Dependencies

Even with a single-server architecture, a few external services are sensible.

Keep external dependencies limited to:

```text
Domain / DNS
Transactional email
AI APIs
Off-site backup
Mobile app stores
```

Everything else can initially run on the VPS.

---

# 36. Scaling Path

The architecture should deliberately make individual components easy to move later.

## Stage 1 — Single Server

```text
Web
API
Worker
PostgreSQL
Redis
Images
```

all on one VPS.

## Stage 2 — Storage Moves Out

When images become large:

```text
LocalStorageService
        ↓
S3StorageService
```

Move media to object storage/CDN.

No business logic changes should be required.

## Stage 3 — Database Moves Out

When reliability/load requires it:

```text
Local PostgreSQL
        ↓
Managed PostgreSQL
```

Application configuration changes primarily through:

```text
DATABASE_URL
```

## Stage 4 — Redis Moves Out

```text
Local Redis
        ↓
Managed Redis
```

## Stage 5 — Separate Workers

Run multiple worker containers/servers for:

```text
Image processing
AI jobs
Analytics
Notifications
```

## Stage 6 — Search Service

If PostgreSQL search becomes limiting:

```text
PostgreSQL
        ↓
Meilisearch / OpenSearch
```

## Stage 7 — Multiple API Instances

Add load balancing and multiple API containers when traffic requires it.

The important point is that **none of this is required on day one**.

---

# 37. Final Recommended V1 Stack

```text
LANGUAGE
TypeScript

MONOREPO
pnpm
Turborepo

WEB
Next.js
React
Tailwind CSS
TanStack Query
React Hook Form
Zod

MOBILE
React Native
Expo
Expo Router
TanStack Query
Zustand
Reanimated
Gesture Handler
FlashList

BACKEND
NestJS
REST
OpenAPI / Swagger

DATABASE
PostgreSQL

ORM
Prisma

VALIDATION
Zod

QUEUE / JOBS
Redis
BullMQ

SEARCH
PostgreSQL
pg_trgm
full-text search

IMAGE PROCESSING
Sharp

IMAGE STORAGE
Local filesystem

AUTH
Better Auth

REVERSE PROXY
Caddy

DEPLOYMENT
Docker Compose

SERVER
Single Ubuntu VPS

CATALOGUE
JSON staging
PostgreSQL production catalogue

ANALYTICS
Own PostgreSQL event tables

AI
External API

EMAIL
External transactional provider

BACKUP
Off-server backup
```

---

# 38. Core Philosophy

The initial infrastructure should be deliberately boring.

The marketplace does **not** need:

```text
Microservices
Kubernetes
Distributed databases
Dedicated search clusters
Cloud-native architecture
Complex event infrastructure
```

to prove the concept.

The first target should be:

> **Local development + one cheap Test VPS + one cheap Production VPS + domains + off-site Production backup + usage-based external AI/email services.**

The Test server can be smaller than Production if required. Both deployed environments should use the same Docker-based architecture so releases can be validated under realistic conditions before going live.

That keeps:

```text
Fixed monthly cost low
Deployment simple
Debugging simple
Local development similar to production
Infrastructure understandable
Migration paths clear
```

while still supporting a substantial early marketplace.

The architecture should only become more complicated when real usage proves that a component needs to move or scale.
