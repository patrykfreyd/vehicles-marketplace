/*
  Warnings:

  - You are about to drop the column `path` on the `media` table. All the data in the column will be lost.
  - Added the required column `original_path` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('EXTERIOR', 'INTERIOR', 'ENGINE', 'BOOT', 'DAMAGE', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- DropIndex
DROP INDEX "media_listing_id_idx";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "path",
ADD COLUMN     "category" "MediaCategory",
ADD COLUMN     "category_confidence" DOUBLE PRECISION,
ADD COLUMN     "category_source" "EquipmentSource",
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "large_path" TEXT,
ADD COLUMN     "medium_path" TEXT,
ADD COLUMN     "original_path" TEXT NOT NULL,
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "thumbnail_path" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "media_listing_id_position_idx" ON "media"("listing_id", "position");
