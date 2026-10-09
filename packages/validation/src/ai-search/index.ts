import { z } from 'zod';
import { SearchRequestSchema } from '../search/search-request';
import { SearchResponseSchema, SearchResultSchema } from '../search/search-result';
import { BodyStyleSchema } from '../enums/body-style';

// Reuse individual fields: Zod cannot omit fields from a refined object.
// Geographic coordinates and catalogue hierarchy IDs are deliberately excluded:
// the model must not guess them. Make/equipment IDs are checked against vocabulary.
const s = SearchRequestSchema.shape;
export const AiSearchFilterSchema = z.strictObject({
  query: s.query,
  makeIds: s.makeIds,
  minPricePence: s.minPricePence,
  maxPricePence: s.maxPricePence,
  minYear: s.minYear,
  maxYear: s.maxYear,
  minMileage: s.minMileage,
  maxMileage: s.maxMileage,
  fuel: s.fuel,
  transmission: s.transmission,
  drivetrain: s.drivetrain,
  bodyStyle: s.bodyStyle,
  colourFamily: s.colourFamily,
  minPowerBhp: s.minPowerBhp,
  minTorqueNm: s.minTorqueNm,
  maxZeroToSixtyTwo: s.maxZeroToSixtyTwo,
  engineFamily: s.engineFamily,
  equipmentIds: s.equipmentIds,
});
export type AiSearchFilter = z.infer<typeof AiSearchFilterSchema>;

export const CarFinderCriteriaSchema = z.strictObject({
  maxPricePence: z.number().int().positive(),
  weights: z.strictObject({
    practicality: z.number().min(0).max(1),
    performance: z.number().min(0).max(1),
    affordability: z.number().min(0).max(1),
    mileage: z.number().min(0).max(1),
  }),
  preferredBodyStyles: z.array(BodyStyleSchema).max(8),
  targetPowerBhp: z.number().int().positive().nullable(),
  targetMileageMiles: z.number().int().positive().nullable(),
  requiredEquipmentIds: z.array(z.string().min(1)).max(30),
});
export type CarFinderCriteria = z.infer<typeof CarFinderCriteriaSchema>;

// Strict OpenAI tools require every property, with null representing no change.
// Clearing a previous constraint is explicit, never an accidental dropped field.
function nullableShape<T extends z.ZodRawShape>(shape: T) {
  return Object.fromEntries(
    Object.entries(shape).map(([key, value]) => [
      key,
      (value as z.ZodOptional<z.ZodType>).unwrap().nullable(),
    ]),
  ) as unknown as {
    [K in keyof T]: z.ZodNullable<T[K] extends z.ZodOptional<infer U> ? U : never>;
  };
}
export const AiExtractionSchema = z.strictObject({
  filters: z.strictObject(nullableShape(AiSearchFilterSchema.shape)),
  clearFields: z.array(AiSearchFilterSchema.keyof()).max(20),
  clarifyingQuestion: z.string().min(1).max(500).nullable(),
  criteria: CarFinderCriteriaSchema.nullable(),
});
export type AiExtraction = z.infer<typeof AiExtractionSchema>;

export const AiMessageRequestSchema = z.strictObject({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});
export type AiMessageRequest = z.infer<typeof AiMessageRequestSchema>;

export const CarRecommendationSchema = z.object({
  derivativeId: z.string().min(1),
  listing: SearchResultSchema,
  matchScore: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
});
export type CarRecommendation = z.infer<typeof CarRecommendationSchema>;
export const AiMessageResponseSchema = z.object({
  sessionId: z.string().uuid(),
  filters: AiSearchFilterSchema,
  clarifyingQuestion: z.string().optional(),
  nextQuestion: z.string().optional(),
  results: SearchResponseSchema.optional(),
  searchId: z.string().optional(),
  recommendations: z.array(CarRecommendationSchema).optional(),
  candidateCount: z.number().int().nonnegative().optional(),
  totalMatches: z.number().int().nonnegative().optional(),
});
export type AiMessageResponse = z.infer<typeof AiMessageResponseSchema>;

export function mergeAiFilters(previous: AiSearchFilter, extraction: AiExtraction): AiSearchFilter {
  const next: Record<string, unknown> = { ...previous };
  for (const key of extraction.clearFields) delete next[key];
  for (const [key, value] of Object.entries(extraction.filters)) {
    if (value !== null) next[key] = value;
  }
  const filters = AiSearchFilterSchema.parse(next);
  SearchRequestSchema.parse(filters); // Cross-field range checks still apply.
  return filters;
}
