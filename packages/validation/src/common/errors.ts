/**
 * The one shared shape every API error response is serialized into (see
 * plans/03-shared-types-validation.md §6). This is what connects two
 * separate front-end requirements to one backend contract:
 *
 * - `fieldErrors` is read by the form layer and rendered inline below the
 *   relevant input. Zod's own `.flatten().fieldErrors` maps directly onto
 *   this shape, so request-body validation failures need no reshaping.
 * - `message` (and any error with no `fieldErrors`) is what the toast
 *   system renders — a network failure, a 500, or a business-rule
 *   rejection always has a toast-ready string.
 *
 * No error should ever be forced into the wrong channel.
 */
import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string().min(1, 'code is required'),
  message: z.string().min(1, 'message is required'),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
