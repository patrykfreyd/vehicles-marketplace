-- CreateEnum
CREATE TYPE "Fuel" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'PHEV', 'ELECTRIC', 'HYDROGEN');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC', 'DCT', 'CVT');

-- CreateEnum
CREATE TYPE "Drivetrain" AS ENUM ('FWD', 'RWD', 'AWD');

-- CreateEnum
CREATE TYPE "BodyStyle" AS ENUM ('HATCHBACK', 'SALOON', 'ESTATE', 'COUPE', 'CONVERTIBLE', 'SUV', 'MPV', 'PICKUP');

-- CreateEnum
CREATE TYPE "EngineConfiguration" AS ENUM ('INLINE_3', 'INLINE_4', 'INLINE_5', 'INLINE_6', 'V6', 'V8', 'V10', 'V12', 'FLAT_4', 'FLAT_6', 'ELECTRIC_MOTOR');

-- CreateEnum
CREATE TYPE "Aspiration" AS ENUM ('NATURALLY_ASPIRATED', 'TURBO', 'TWIN_TURBO', 'SUPERCHARGED', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "ColourFamily" AS ENUM ('BLACK', 'WHITE', 'BLUE', 'RED', 'GREEN', 'GREY', 'SILVER', 'YELLOW', 'ORANGE', 'PURPLE', 'BROWN', 'BEIGE');

-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('IMPORTED', 'AI_DRAFT', 'REVIEW_REQUIRED', 'SOURCE_CONFIRMED', 'APPROVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "CatalogueEntityType" AS ENUM ('MAKE', 'MODEL', 'GENERATION', 'DERIVATIVE', 'ENGINE_FAMILY', 'MANUFACTURER_COLOUR');

-- CreateTable
CREATE TABLE "makes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "makes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "production_start_year" INTEGER NOT NULL,
    "production_end_year" INTEGER,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derivatives" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "special_edition" BOOLEAN NOT NULL DEFAULT false,
    "body_style" "BodyStyle" NOT NULL,
    "doors" INTEGER,
    "seats" INTEGER,
    "fuel" "Fuel" NOT NULL,
    "engine_capacity_cc" INTEGER,
    "cylinders" INTEGER,
    "configuration" "EngineConfiguration",
    "aspiration" "Aspiration",
    "engine_family" TEXT,
    "power_bhp" INTEGER,
    "torque_nm" INTEGER,
    "transmissions" "Transmission"[] DEFAULT ARRAY[]::"Transmission"[],
    "drivetrain" "Drivetrain" NOT NULL,
    "drivetrain_manufacturer_name" TEXT,
    "zero_to_sixty_two_seconds" DOUBLE PRECISION,
    "top_speed_mph" INTEGER,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'AI_DRAFT',
    "confidence" DOUBLE PRECISION,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "completeness_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "derivatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_colours" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" "ColourFamily" NOT NULL,
    "paint_code" TEXT,

    CONSTRAINT "manufacturer_colours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_equipment_aliases" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "manufacturer_name" TEXT NOT NULL,

    CONSTRAINT "manufacturer_equipment_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_aliases" (
    "id" TEXT NOT NULL,
    "entity_type" "CatalogueEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "catalogue_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "models_make_id_idx" ON "models"("make_id");

-- CreateIndex
CREATE INDEX "generations_model_id_idx" ON "generations"("model_id");

-- CreateIndex
CREATE INDEX "derivatives_generation_id_idx" ON "derivatives"("generation_id");

-- CreateIndex
CREATE INDEX "manufacturer_colours_make_id_idx" ON "manufacturer_colours"("make_id");

-- CreateIndex
CREATE INDEX "manufacturer_equipment_aliases_equipment_id_idx" ON "manufacturer_equipment_aliases"("equipment_id");

-- CreateIndex
CREATE INDEX "catalogue_aliases_entity_type_entity_id_idx" ON "catalogue_aliases"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "catalogue_aliases_alias_idx" ON "catalogue_aliases"("alias");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "makes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivatives" ADD CONSTRAINT "derivatives_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_colours" ADD CONSTRAINT "manufacturer_colours_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "makes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_equipment_aliases" ADD CONSTRAINT "manufacturer_equipment_aliases_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
