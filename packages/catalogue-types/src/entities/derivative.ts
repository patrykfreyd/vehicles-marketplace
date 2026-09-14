/**
 * plans/08-catalogue-data-model-json-schema.md §5/§6 — mirrors the
 * `Derivative` Prisma model (Level 2 completeness per idea doc §20:
 * identity, body, engine, transmission, drivetrain, performance where
 * available).
 *
 * Two deliberate departures from the plan's own §6 sketch:
 * - `transmissions` defaults to `[]` instead of requiring `.min(1)` — the
 *   idea doc's own worked example (§24, this repo's
 *   `catalogue/bmw/m4.json`) omits transmissions on the F82 "M4
 *   Competition" derivative entirely, and §8's completeness score treats
 *   transmissions as one of the optional fields a record can legitimately
 *   be missing, not a required one.
 * - `createdAt`/`updatedAt` are left out entirely — they're Prisma-managed
 *   bookkeeping (`@default(now())`/`@updatedAt`), never part of what a
 *   human/AI author or importer supplies, so there's nothing for this
 *   schema to validate there (same reasoning as `CurrentUserSchema` in
 *   `@vehicles-marketplace/validation` leaving out `User`'s timestamps).
 *
 * `aliases` isn't a DB column (see `generation.ts`'s note) but is part of
 * this schema for the same reason — authored alongside the entity, split
 * out into `CatalogueAlias` rows by Plan 09's importer.
 */
import { z } from 'zod';
import {
  BodyStyleSchema,
  DrivetrainSchema,
  FuelTypeSchema,
  TransmissionSchema,
} from '@vehicles-marketplace/validation';
import { CatalogueSlugSchema } from '../common/slug';
import { AspirationSchema } from '../enums/aspiration';
import { CatalogueStatusSchema } from '../enums/catalogue-status';
import { EngineConfigurationSchema } from '../enums/engine-configuration';

export const DerivativeSchema = z.object({
  id: CatalogueSlugSchema, // e.g. "bmw-m4-g82-competition-xdrive"
  generationId: CatalogueSlugSchema,
  name: z.string().min(1), // "M4 Competition xDrive"
  specialEdition: z.boolean().default(false),

  bodyStyle: BodyStyleSchema,
  doors: z.number().int().positive().optional(),
  seats: z.number().int().positive().optional(),

  fuel: FuelTypeSchema,
  engineCapacityCc: z.number().int().positive().optional(),
  cylinders: z.number().int().positive().optional(),
  configuration: EngineConfigurationSchema.optional(),
  aspiration: AspirationSchema.optional(),
  engineFamily: z.string().min(1).optional(), // "S58"
  powerBhp: z.number().int().positive().optional(),
  torqueNm: z.number().int().positive().optional(),

  transmissions: z.array(TransmissionSchema).default([]),
  drivetrain: DrivetrainSchema,
  drivetrainManufacturerName: z.string().min(1).optional(), // "M xDrive"

  zeroToSixtyTwoSeconds: z.number().positive().optional(),
  topSpeedMph: z.number().int().positive().optional(),

  status: CatalogueStatusSchema.default('AI_DRAFT'),
  confidence: z.number().min(0).max(1).optional(),
  reviewed: z.boolean().default(false),
  completenessScore: z.number().int().min(0).max(100).default(0),

  aliases: z.array(z.string().min(1)).default([]),
});

export type Derivative = z.infer<typeof DerivativeSchema>;
