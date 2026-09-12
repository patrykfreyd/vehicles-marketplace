# Plan 08 — Catalogue Data Model & JSON Schema

Status: Draft
Depends on: Plan 03 (casing/ID/enum conventions — the fuel, transmission,
drivetrain, body-style enums this plan reuses directly), Plan 06 (Prisma
multi-file schema pattern, `packages/db`)
Blocks: Plan 09 (Import Tooling & Admin — imports *into* the schema this
plan defines), Plan 10 (DVLA matching — matches *against* this catalogue),
Plan 11 (Vehicle references `derivativeId` from this schema), Plan 13
(Search filters against these fields), Plan 14 (AI Search's structured
output targets this schema's enums)

## 1. Objective

Turn `idea/vehicle_database_catalogue_approach.md`'s design into a concrete,
buildable schema: the **Make → Model → Generation → Derivative** Prisma
tables, the controlled enums for engine/colour/equipment concepts, the
alias mechanism, the data-quality/status tracking, and the JSON staging
format sellers/AI/importers author against. This plan defines the
**schema only** — no importer, no Admin UI (Plan 09), no real manufacturer
data beyond one worked example used to validate the schema itself.

"Done" means: the catalogue Prisma tables exist and are migrated, a Zod
schema for each catalogue entity exists in `packages/catalogue-types`, a
JSON Schema file is generated from those Zod schemas (not hand-maintained
separately), and the BMW M4 example JSON from the idea doc validates
against it end-to-end.

## 2. Decisions carried over from `idea/vehicle_database_catalogue_approach.md`

- Three separate concepts, never conflated: **catalogue** (derivative —
  shared by every car of that type), **vehicle** (the individual physical
  car — Plan 11), **listing** (the advert — Plan 11).
- Hierarchy: `Make → Model → Generation → Derivative`.
- V1 target: **Level 2 completeness** (§20 of the idea doc) — identity,
  body, engine, transmission, drivetrain, performance where available —
  not full factory-option-code depth (explicitly postponed per §12).
- **JSON is the staging/authoring format; PostgreSQL is production** — not
  the other way around, and not JSON-only.
- Equipment: a small **global taxonomy** (~20–30 desirable/searchable
  items), not a per-derivative standard/optional matrix — the catalogue
  doc is explicit that equipment is *vehicle*-level information the seller
  supplies, not something the catalogue needs to track per derivative.
- Colour: two-level — canonical **colour family** (Blue, Black, ...) plus
  **manufacturer paint name** (Marina Bay Blue Metallic) with aliases —
  kept as its own manufacturer-colour catalogue, not tied to specific
  derivatives.
- Aliases exist from day one for generations, derivatives, engine
  families, and paint names.
- Controlled values everywhere (fuel, transmission, drivetrain, body,
  colour family) — no free-text duplicates of the same concept.
- Every catalogue entity has a **permanent internal ID** independent of
  its display name (idea doc §29) — per Plan 03 §5, catalogue entities use
  human-readable **slugs** as that permanent ID.
- Every AI-created/imported record carries data-quality metadata
  (status + confidence + review flag) — nothing AI-generated is silently
  treated as trusted production data.
- Build **manufacturer by manufacturer**, BMW first (idea doc §19/§38 —
  generation codes + enthusiast terminology stress-test the model well).

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| JSON Schema authoring | **Generate** `catalogue.schema.json` from the Zod schemas in `packages/catalogue-types` (via `zod-to-json-schema`), rather than hand-writing a separate JSON Schema file | The idea doc's original plan (§38 steps 2–3) treats "define JSON Schema" and "define DB schema" as two independent artifacts. Deriving the JSON Schema from the same Zod source used for import validation and AI structured-output validation removes a whole class of drift — one schema definition, three consumers (JSON Schema for editor/CI validation, Zod for the importer, Zod for AI-output validation in Plan 14) |
| Engine fields | **Embedded directly on `Derivative`** (capacity, family, power, torque, aspiration, configuration), not a separate normalized `Engine` table | The idea doc's own JSON examples show engine fields flat inside each derivative object, and in practice one derivative ≈ one engine spec. A separate `Engine` table would only pay off if engines were shared/reused across many derivatives with independent lifecycle — not the case here |
| Multiple transmissions per derivative | Native Postgres/Prisma **enum array column** (`transmissions Transmission[]`), matching the idea doc's own example (`"transmissions": ["MANUAL", "DCT"]`) | Simpler than a join table for a small fixed-cardinality list, and Prisma/Postgres support array-containment queries (`has`/`hasSome`) directly for filtering |
| Aliases storage | One generic `CatalogueAlias` table (`entityType`, `entityId`, `alias`), not a text-array column per entity | The idea doc's own DB structure (§28) lists `catalogue_aliases` as its own table. A single table lets Plan 13 (Search) do one alias lookup across generations, derivatives, engine families, and paint names uniformly instead of querying N different array columns |
| Completeness score | Computed **at import time** and stored (`completenessScore Int` on `Derivative`), not computed on every read | Plan 09's Catalogue Admin lists hundreds of derivatives with their completeness percentage — computing it per-request would mean recalculating the same value on every page load for data that only changes on import |

## 4. Controlled enums added by this plan

Beyond the four already defined in Plan 03 §7 (fuel, transmission,
drivetrain, body style):

```prisma
enum EngineConfiguration {
  INLINE_3
  INLINE_4
  INLINE_5
  INLINE_6
  V6
  V8
  V10
  V12
  FLAT_4
  FLAT_6
  ELECTRIC_MOTOR
}

enum Aspiration {
  NATURALLY_ASPIRATED
  TURBO
  TWIN_TURBO
  SUPERCHARGED
  ELECTRIC
}

enum ColourFamily {
  BLACK
  WHITE
  BLUE
  RED
  GREEN
  GREY
  SILVER
  YELLOW
  ORANGE
  PURPLE
  BROWN
  BEIGE
}

enum CatalogueStatus {
  IMPORTED
  AI_DRAFT
  REVIEW_REQUIRED
  SOURCE_CONFIRMED
  APPROVED
  DEPRECATED
}

enum CatalogueEntityType {
  MAKE
  MODEL
  GENERATION
  DERIVATIVE
  ENGINE_FAMILY
  MANUFACTURER_COLOUR
}
```

Equipment category (`Seats`, `Technology`, `Audio`, `Parking`, `Driver
Assistance`, `Comfort`, etc. from the idea doc §7) is a plain string on the
`Equipment` model rather than an enum — the category list is expected to
grow with the taxonomy itself and doesn't gate any filtering logic the way
fuel/drivetrain do.

## 5. Prisma schema (`prisma/schema/catalogue.prisma`)

```prisma
model Make {
  id   String @id            // slug, e.g. "bmw"
  name String

  models Model[]
  colours ManufacturerColour[]

  @@map("makes")
}

model Model {
  id     String @id           // slug, e.g. "bmw-m4"
  makeId String @map("make_id")
  make   Make   @relation(fields: [makeId], references: [id])
  name   String

  generations Generation[]

  @@map("models")
}

model Generation {
  id                 String    @id   // slug, e.g. "bmw-m4-g82"
  modelId            String    @map("model_id")
  model              Model     @relation(fields: [modelId], references: [id])
  code               String                       // "G82"
  productionStartYear Int      @map("production_start_year")
  productionEndYear   Int?     @map("production_end_year")

  derivatives Derivative[]

  @@map("generations")
}

model Derivative {
  id           String   @id          // slug, e.g. "bmw-m4-g82-competition-xdrive"
  generationId String   @map("generation_id")
  generation   Generation @relation(fields: [generationId], references: [id])
  name         String                             // "M4 Competition xDrive"
  specialEdition Boolean @default(false) @map("special_edition")

  bodyStyle    BodyStyle    @map("body_style")
  doors        Int?
  seats        Int?

  fuel               Fuel
  engineCapacityCc   Int?     @map("engine_capacity_cc")
  cylinders          Int?
  configuration      EngineConfiguration?
  aspiration         Aspiration?
  engineFamily       String?  @map("engine_family")     // "S58"
  powerBhp           Int?     @map("power_bhp")
  torqueNm           Int?     @map("torque_nm")

  transmissions Transmission[]
  drivetrain    Drivetrain     @map("drivetrain")
  drivetrainManufacturerName String? @map("drivetrain_manufacturer_name") // "M xDrive"

  zeroToSixtyTwoSeconds Float?  @map("zero_to_sixty_two_seconds")
  topSpeedMph           Int?    @map("top_speed_mph")

  status           CatalogueStatus @default(AI_DRAFT)
  confidence       Float?
  reviewed         Boolean         @default(false)
  completenessScore Int            @default(0) @map("completeness_score")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([generationId])
  @@map("derivatives")
}

model ManufacturerColour {
  id         String       @id
  makeId     String       @map("make_id")
  make       Make         @relation(fields: [makeId], references: [id])
  name       String                              // "Marina Bay Blue Metallic"
  family     ColourFamily
  paintCode  String?      @map("paint_code")      // "C1K"

  @@map("manufacturer_colours")
}

model Equipment {
  id       String @id                     // "carbon_bucket_seats"
  name     String                          // canonical display name
  category String

  manufacturerAliases ManufacturerEquipmentAlias[]

  @@map("equipment")
}

model ManufacturerEquipmentAlias {
  id           String    @id
  equipmentId  String    @map("equipment_id")
  equipment    Equipment @relation(fields: [equipmentId], references: [id])
  makeId       String    @map("make_id")
  manufacturerName String @map("manufacturer_name")   // "M Carbon Bucket Seats"

  @@map("manufacturer_equipment_aliases")
}

model CatalogueAlias {
  id         String              @id
  entityType CatalogueEntityType @map("entity_type")
  entityId   String              @map("entity_id")
  alias      String

  @@index([entityType, entityId])
  @@index([alias])
  @@map("catalogue_aliases")
}
```

Deliberately **not** created in this plan: any table linking `Equipment`
to `Derivative` — per §2, equipment is vehicle-level, not catalogue-level,
so that relationship doesn't exist anywhere in this schema.

## 6. Zod schemas (`packages/catalogue-types`)

One schema per model above, following Plan 03's conventions exactly
(camelCase, `UPPER_SNAKE_CASE` enums, units in field names). Example:

```ts
export const DerivativeSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  name: z.string(),
  specialEdition: z.boolean().default(false),
  bodyStyle: BodyStyleSchema,
  fuel: FuelSchema,
  engineCapacityCc: z.number().int().positive().optional(),
  engineFamily: z.string().optional(),
  powerBhp: z.number().int().positive().optional(),
  torqueNm: z.number().int().positive().optional(),
  transmissions: z.array(TransmissionSchema).min(1),
  drivetrain: DrivetrainSchema,
  drivetrainManufacturerName: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  // ...
});
```

Note `aliases` appears on the **JSON staging shape** (authored alongside
the entity, per the idea doc's examples) even though it's normalized into
the separate `CatalogueAlias` table on import — the importer (Plan 09)
is what splits an authored JSON file's inline `aliases` array into rows in
that table. This plan defines both shapes; Plan 09 owns the mapping
between them.

`catalogue.schema.json` is generated from these Zod schemas via a script
(`pnpm catalogue:generate-json-schema`), not maintained by hand — kept in
`catalogue/schema/` per the repo layout Plan 01 already reserved.

## 7. Worked example: validating the idea doc's own BMW M4 JSON

The idea doc's §24 example file (BMW M4, generations F82/G82, several
derivatives) is used as this plan's test fixture: it must validate
successfully against `DerivativeSchema` (and the surrounding
Generation/Model/Make schemas) with zero schema errors, proving the schema
actually accommodates the real shape of data it needs to hold — not just a
toy example invented for this plan.

## 8. Completeness scoring (computed, per §3)

A simple, transparent weighted check across the Level 2 fields (idea doc
§33), computed once at import time and stored:

```text
identity (make/model/generation/derivative present)   required, always 100%
engineCapacityCc, cylinders, configuration, aspiration, engineFamily,
powerBhp, torqueNm, transmissions, drivetrain              → 8 optional fields
zeroToSixtyTwoSeconds, topSpeedMph                           → 2 optional fields

completenessScore = round(100 × presentOptionalFields / totalOptionalFields)
```

This intentionally mirrors the idea doc's own worked examples (100% vs
74% missing torque/engine family/0–62) rather than inventing a different
weighting scheme.

## 9. Out of scope for this plan

- The import CLI, validation reporting, and Catalogue Admin UI → **Plan 09**
- DVLA lookup and derivative-matching logic → **Plan 10**
- Any real manufacturer data beyond the one BMW M4 fixture used to prove
  the schema (§7) — populating BMW, then Audi, etc. is ongoing **content**
  work that happens *using* Plan 09's tooling once it exists, not a
  further dev plan itself
- AI-assisted enrichment workflow mechanics → **Plan 09**
- Search indexing (`pg_trgm`, GIN indexes) over these tables → **Plan 13**

## 10. Acceptance criteria

- [ ] All catalogue Prisma models in §5 migrate cleanly via Plan 06's
      `pnpm db:migrate:dev` workflow.
- [ ] `packages/catalogue-types` exports a Zod schema for every model,
      each with a passing/failing test per Plan 03 §8's rule.
- [ ] `pnpm catalogue:generate-json-schema` produces `catalogue.schema.json`
      from the Zod schemas without manual editing.
- [ ] The idea doc's BMW M4 example JSON (§24) validates successfully
      against the generated schemas end-to-end (Make → Model → Generation
      → Derivative, including both F82 and G82 generations).
- [ ] The completeness-score formula in §8 reproduces the idea doc's own
      worked example percentages when run against equivalent sample data.
- [ ] `CatalogueAlias` supports inserting and querying aliases for at
      least two different `entityType` values (e.g. a `GENERATION` alias
      and a `DERIVATIVE` alias) through one shared query shape.
- [ ] `pnpm lint`/`typecheck`/`build` remain green with the new package and
      schema files added.

## 11. Open questions for you

1. Confirm generating `catalogue.schema.json` from Zod (§3) rather than
   hand-authoring it separately — this is a deviation from the idea doc's
   literal two-artifact plan, in favor of one source of truth.
2. Confirm embedding engine fields directly on `Derivative` rather than a
   separate `Engine` table (§3) — any known case where one engine spec is
   genuinely shared/reused across multiple derivatives in a way that would
   argue for normalizing it out?
3. Confirm BMW as the first manufacturer to actually populate once Plan 09
   ships tooling, per the idea doc's own recommendation.
