import { z } from 'zod';

/**
 * plans/10-dvla-lookup-seller-matching.md §5 —
 * `GET /vehicle-lookup/:id/model-candidates`: Plan 08's `Model` table,
 * filtered by the DVLA-confirmed Make, for the seller's autocomplete step
 * (DVLA doesn't return a model, so this is entirely catalogue-driven).
 */
export const ModelCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export type ModelCandidate = z.infer<typeof ModelCandidateSchema>;

export const ListModelCandidatesQuerySchema = z.object({
  makeId: z.string().min(1, 'makeId is required'),
  // Optional free-text filter for the autocomplete's typeahead — every
  // Model under the make is returned when omitted.
  q: z.string().trim().min(1).optional(),
});

export type ListModelCandidatesQuery = z.infer<typeof ListModelCandidatesQuerySchema>;
