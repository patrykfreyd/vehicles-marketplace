import { z } from 'zod';
import { RegistrationInputSchema } from './registration';

/** plans/10-dvla-lookup-seller-matching.md §5 — `POST /vehicle-lookup/dvla`'s body. */
export const DvlaLookupRequestSchema = z.object({
  registration: RegistrationInputSchema,
});

export type DvlaLookupRequest = z.infer<typeof DvlaLookupRequestSchema>;
