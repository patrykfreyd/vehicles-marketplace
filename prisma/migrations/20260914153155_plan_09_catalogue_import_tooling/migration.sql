-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "catalogue_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "license_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derivative_sources" (
    "id" TEXT NOT NULL,
    "derivative_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "derivative_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_imports" (
    "id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "imported_by" TEXT,
    "records_created" INTEGER NOT NULL,
    "records_updated" INTEGER NOT NULL,
    "warnings_count" INTEGER NOT NULL,
    "errors_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_validation_issues" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "entity_type" "CatalogueEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "derivative_sources_derivative_id_idx" ON "derivative_sources"("derivative_id");

-- CreateIndex
CREATE UNIQUE INDEX "derivative_sources_derivative_id_source_id_key" ON "derivative_sources"("derivative_id", "source_id");

-- CreateIndex
CREATE INDEX "catalogue_imports_manufacturer_id_idx" ON "catalogue_imports"("manufacturer_id");

-- CreateIndex
CREATE INDEX "catalogue_validation_issues_entity_type_entity_id_idx" ON "catalogue_validation_issues"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "catalogue_validation_issues_resolved_idx" ON "catalogue_validation_issues"("resolved");

-- AddForeignKey
ALTER TABLE "derivative_sources" ADD CONSTRAINT "derivative_sources_derivative_id_fkey" FOREIGN KEY ("derivative_id") REFERENCES "derivatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivative_sources" ADD CONSTRAINT "derivative_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "catalogue_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_validation_issues" ADD CONSTRAINT "catalogue_validation_issues_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "catalogue_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
