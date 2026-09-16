-- CreateTable
CREATE TABLE "vehicle_lookups" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "dvla_make" TEXT,
    "dvla_year_of_manufacture" INTEGER,
    "dvla_engine_capacity_cc" INTEGER,
    "dvla_fuel" "Fuel",
    "dvla_colour" TEXT,
    "dvla_tax_status" TEXT,
    "dvla_mot_status" TEXT,
    "dvla_mot_expiry_date" TIMESTAMP(3),
    "dvla_raw_response" JSONB,
    "candidate_derivative_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selected_derivative_id" TEXT,
    "matched_manually" BOOLEAN NOT NULL DEFAULT false,
    "prediction_accepted" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_lookups_requested_by_user_id_idx" ON "vehicle_lookups"("requested_by_user_id");

-- AddForeignKey
ALTER TABLE "vehicle_lookups" ADD CONSTRAINT "vehicle_lookups_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
