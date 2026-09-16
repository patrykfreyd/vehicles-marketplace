-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('PRIVATE', 'DEALER');

-- CreateEnum
CREATE TYPE "ServiceHistoryType" AS ENUM ('FULL', 'PARTIAL', 'NONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WriteOffCategory" AS ENUM ('CAT_A', 'CAT_B', 'CAT_S', 'CAT_N');

-- CreateEnum
CREATE TYPE "ModificationCategory" AS ENUM ('ECU_TUNE', 'EXHAUST', 'INTAKE', 'FORCED_INDUCTION', 'SUSPENSION', 'BRAKES', 'WHEELS', 'BODYWORK', 'INTERIOR', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentSource" AS ENUM ('SELLER_DECLARED', 'AI_DETECTED');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'PAUSED';

-- DropIndex
DROP INDEX "listings_vehicle_id_idx";

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "location_country" TEXT DEFAULT 'GB',
ADD COLUMN     "location_postcode_area" TEXT,
ADD COLUMN     "price_pence" INTEGER NOT NULL,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "reserved_at" TIMESTAMP(3),
ADD COLUMN     "sold_at" TIMESTAMP(3),
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN     "type" "SellerType" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "accident_declared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colour_family" "ColourFamily",
ADD COLUMN     "derivative_id" TEXT,
ADD COLUMN     "dvla_mot_expiry_date" TIMESTAMP(3),
ADD COLUMN     "dvla_mot_status" TEXT,
ADD COLUMN     "dvla_tax_status" TEXT,
ADD COLUMN     "first_registered_at" TIMESTAMP(3),
ADD COLUMN     "import_country" TEXT,
ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interior_description" TEXT,
ADD COLUMN     "main_dealer_history" BOOLEAN,
ADD COLUMN     "manufacturer_colour_id" TEXT,
ADD COLUMN     "mileage_miles" INTEGER NOT NULL,
ADD COLUMN     "owners_count" INTEGER,
ADD COLUMN     "registration" TEXT NOT NULL,
ADD COLUMN     "service_history_type" "ServiceHistoryType",
ADD COLUMN     "service_records_available" BOOLEAN,
ADD COLUMN     "uk_supplied" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "upholstery" TEXT,
ADD COLUMN     "vehicle_lookup_id" TEXT,
ADD COLUMN     "write_off_category" "WriteOffCategory";

-- CreateTable
CREATE TABLE "listing_price_history" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "price_pence" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_equipment" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "source" "EquipmentSource" NOT NULL DEFAULT 'SELLER_DECLARED',

    CONSTRAINT "vehicle_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_modifications" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "category" "ModificationCategory" NOT NULL,
    "brand" TEXT,
    "product" TEXT,
    "description" TEXT,

    CONSTRAINT "vehicle_modifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_price_history_listing_id_idx" ON "listing_price_history"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_equipment_vehicle_id_equipment_id_key" ON "vehicle_equipment"("vehicle_id", "equipment_id");

-- CreateIndex
CREATE INDEX "vehicle_modifications_vehicle_id_idx" ON "vehicle_modifications"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "listings_vehicle_id_key" ON "listings"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_lookup_id_key" ON "vehicles"("vehicle_lookup_id");

-- AddForeignKey
ALTER TABLE "listing_price_history" ADD CONSTRAINT "listing_price_history_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_derivative_id_fkey" FOREIGN KEY ("derivative_id") REFERENCES "derivatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_lookup_id_fkey" FOREIGN KEY ("vehicle_lookup_id") REFERENCES "vehicle_lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_manufacturer_colour_id_fkey" FOREIGN KEY ("manufacturer_colour_id") REFERENCES "manufacturer_colours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_equipment" ADD CONSTRAINT "vehicle_equipment_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_equipment" ADD CONSTRAINT "vehicle_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_modifications" ADD CONSTRAINT "vehicle_modifications_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

