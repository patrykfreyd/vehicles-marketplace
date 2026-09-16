import { z } from 'zod';
import { BodyStyleSchema } from '../enums/body-style';
import { DrivetrainSchema } from '../enums/drivetrain';
import { FuelTypeSchema } from '../enums/fuel';
import { TransmissionSchema } from '../enums/transmission';

/**
 * plans/10-dvla-lookup-seller-matching.md §3/§5 —
 * `GET /vehicle-lookup/:id/derivative-candidates`'s ranked shortlist: an
 * `APPROVED` catalogue Derivative (Plan 08/09), plus the two fields the
 * seller-facing UI needs to explain *why* it's ranked where it is —
 * `engineCapacityDiffCc` (ascending sort key) and `withinTolerance` (the
 * ±50cc band §3 calls a "good enough to suggest with confidence" match).
 */
export const DerivativeCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generationId: z.string().min(1),
  generationCode: z.string().min(1),
  fuel: FuelTypeSchema,
  engineCapacityCc: z.number().int().positive().nullable(),
  powerBhp: z.number().int().positive().nullable(),
  drivetrain: DrivetrainSchema,
  transmissions: z.array(TransmissionSchema),
  bodyStyle: BodyStyleSchema,
  engineCapacityDiffCc: z.number().int().nonnegative().nullable(),
  withinTolerance: z.boolean(),
});

export type DerivativeCandidate = z.infer<typeof DerivativeCandidateSchema>;

export const ListDerivativeCandidatesQuerySchema = z.object({
  modelId: z.string().min(1, 'modelId is required'),
});

export type ListDerivativeCandidatesQuery = z.infer<typeof ListDerivativeCandidatesQuerySchema>;
