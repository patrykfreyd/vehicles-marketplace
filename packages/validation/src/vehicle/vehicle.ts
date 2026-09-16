import { z } from 'zod';
import { ColourFamilySchema } from '../enums/colour-family';
import { EquipmentSourceSchema } from '../enums/equipment-source';
import { ModificationCategorySchema } from '../enums/modification-category';
import { ServiceHistoryTypeSchema } from '../enums/service-history-type';
import { WriteOffCategorySchema } from '../enums/write-off-category';

/**
 * plans/11-vehicle-listing-data-model.md §5 — the full seller/DVLA-supplied
 * vehicle record. `registration` is returned as-is by the service layer:
 * masked for a non-owner/non-admin viewer, full for the owner or an admin
 * (§3) — this schema doesn't encode that distinction itself, since the same
 * shape is reused for both.
 */
export const VehicleEquipmentItemSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  equipmentId: z.string().min(1),
  source: EquipmentSourceSchema,
});

export type VehicleEquipmentItem = z.infer<typeof VehicleEquipmentItemSchema>;

export const VehicleModificationItemSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  category: ModificationCategorySchema,
  brand: z.string().min(1).nullable(),
  product: z.string().min(1).nullable(),
  description: z.string().min(1).nullable(),
});

export type VehicleModificationItem = z.infer<typeof VehicleModificationItemSchema>;

export const VehicleSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  derivativeId: z.string().min(1).nullable(),
  vehicleLookupId: z.string().min(1).nullable(),

  registration: z.string().min(1),
  firstRegisteredAt: z.string().min(1).nullable(),
  mileageMiles: z.number().int().nonnegative(),
  ownersCount: z.number().int().nonnegative().nullable(),

  colourFamily: ColourFamilySchema.nullable(),
  manufacturerColourId: z.string().min(1).nullable(),

  interiorDescription: z.string().min(1).nullable(),
  upholstery: z.string().min(1).nullable(),

  ukSupplied: z.boolean(),
  imported: z.boolean(),
  importCountry: z.string().min(1).nullable(),

  serviceHistoryType: ServiceHistoryTypeSchema.nullable(),
  mainDealerHistory: z.boolean().nullable(),
  serviceRecordsAvailable: z.boolean().nullable(),

  accidentDeclared: z.boolean(),
  writeOffCategory: WriteOffCategorySchema.nullable(),

  dvlaTaxStatus: z.string().min(1).nullable(),
  dvlaMotStatus: z.string().min(1).nullable(),
  dvlaMotExpiryDate: z.string().min(1).nullable(),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),

  equipment: z.array(VehicleEquipmentItemSchema),
  modifications: z.array(VehicleModificationItemSchema),
});

export type Vehicle = z.infer<typeof VehicleSchema>;
