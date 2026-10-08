-- plans/13-search-filtering.md §4 — free-text search against catalogue
-- names/aliases. Hand-added: Prisma's schema language can't express a GIN
-- trigram index, so this extension/index pair isn't generated from
-- schema.prisma and must be kept here by hand on any future migration that
-- touches these two columns.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_catalogue_alias_trgm ON catalogue_aliases USING GIN (alias gin_trgm_ops);

CREATE INDEX idx_derivative_name_trgm ON derivatives USING GIN (name gin_trgm_ops);

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "seller_postcode" TEXT;

-- CreateIndex
CREATE INDEX "derivatives_status_idx" ON "derivatives"("status");

-- CreateIndex
CREATE INDEX "derivatives_body_style_idx" ON "derivatives"("body_style");

-- CreateIndex
CREATE INDEX "derivatives_fuel_idx" ON "derivatives"("fuel");

-- CreateIndex
CREATE INDEX "derivatives_drivetrain_idx" ON "derivatives"("drivetrain");

-- CreateIndex
CREATE INDEX "derivatives_power_bhp_idx" ON "derivatives"("power_bhp");

-- CreateIndex
CREATE INDEX "derivatives_engine_family_idx" ON "derivatives"("engine_family");

-- CreateIndex
CREATE INDEX "listings_price_pence_idx" ON "listings"("price_pence");

-- CreateIndex
CREATE INDEX "vehicles_mileage_miles_idx" ON "vehicles"("mileage_miles");

-- CreateIndex
CREATE INDEX "vehicles_colour_family_idx" ON "vehicles"("colour_family");

-- CreateIndex
CREATE INDEX "vehicles_first_registered_at_idx" ON "vehicles"("first_registered_at");
