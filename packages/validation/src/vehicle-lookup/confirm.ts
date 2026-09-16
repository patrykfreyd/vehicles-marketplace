import { z } from 'zod';

/** plans/10-dvla-lookup-seller-matching.md §5 — `POST /vehicle-lookup/:id/confirm`'s body. */
export const ConfirmVehicleLookupRequestSchema = z.object({
  derivativeId: z.string().min(1, 'derivativeId is required'),
  matchedManually: z.boolean().default(false),
});

export type ConfirmVehicleLookupRequest = z.infer<typeof ConfirmVehicleLookupRequestSchema>;

/**
 * §4's feedback signal made visible to the caller: `predictionAccepted` is
 * `true` only when the seller picked the top-ranked candidate the matcher
 * itself suggested, `false` for any other pick (including every manual
 * match) — never `null` once `confirm` has actually run.
 */
export const ConfirmVehicleLookupResponseSchema = z.object({
  id: z.string().min(1),
  selectedDerivativeId: z.string().min(1),
  matchedManually: z.boolean(),
  predictionAccepted: z.boolean(),
});

export type ConfirmVehicleLookupResponse = z.infer<typeof ConfirmVehicleLookupResponseSchema>;
