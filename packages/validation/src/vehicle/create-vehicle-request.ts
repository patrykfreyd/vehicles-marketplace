import { z } from 'zod';
import { ColourFamilySchema } from '../enums/colour-family';
import { ServiceHistoryTypeSchema } from '../enums/service-history-type';
import { WriteOffCategorySchema } from '../enums/write-off-category';

/**
 * plans/11-vehicle-listing-data-model.md §5/§8/§10 — `POST /vehicles`:
 * builds a `Vehicle` from a confirmed `VehicleLookup` (§10's first
 * acceptance criterion — `vehicleLookupId` must point at a lookup this
 * caller owns, with a `selectedDerivativeId` whose `Derivative.status` is
 * `APPROVED`) plus everything the catalogue doc's §9 split says only the
 * seller/DVLA can supply. `registration`, `derivativeId`,
 * `dvlaTaxStatus`/`dvlaMotStatus`/`dvlaMotExpiryDate` are never
 * client-supplied here — the service copies them straight off the
 * `VehicleLookup` row, so a caller can't declare a plate or MOT status that
 * doesn't match what DVLA actually returned.
 */
export const CreateVehicleRequestSchema = z.object({
  vehicleLookupId: z.string().min(1, 'vehicleLookupId is required'),

  mileageMiles: z.number().int().nonnegative('mileageMiles cannot be negative'),
  firstRegisteredAt: z.string().min(1).optional(),
  ownersCount: z.number().int().nonnegative().optional(),

  colourFamily: ColourFamilySchema.optional(),
  manufacturerColourId: z.string().min(1).optional(),

  interiorDescription: z.string().min(1).optional(),
  upholstery: z.string().min(1).optional(),

  ukSupplied: z.boolean().default(true),
  imported: z.boolean().default(false),
  importCountry: z.string().min(1).optional(),

  serviceHistoryType: ServiceHistoryTypeSchema.optional(),
  mainDealerHistory: z.boolean().optional(),
  serviceRecordsAvailable: z.boolean().optional(),

  accidentDeclared: z.boolean().default(false),
  writeOffCategory: WriteOffCategorySchema.optional(),
});

export type CreateVehicleRequest = z.infer<typeof CreateVehicleRequestSchema>;
