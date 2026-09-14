/**
 * plans/09-catalogue-import-tooling-admin.md §9's acceptance criterion:
 * "Only APPROVED derivatives are returned by a basic 'list published
 * catalogue' query used as this plan's stand-in for Plan 13's future
 * search integration." `apps/api/src/modules/catalogue`'s public endpoint
 * returns this shape — everything a buyer-facing list would need, with
 * enough make/model/generation context to render without a second call.
 */
import { z } from 'zod';
import { DerivativeRecordSchema } from '../entities/derivative';

export const PublishedDerivativeSchema = DerivativeRecordSchema.extend({
  makeName: z.string().min(1),
  modelName: z.string().min(1),
  generationCode: z.string().min(1),
});

export type PublishedDerivative = z.infer<typeof PublishedDerivativeSchema>;
