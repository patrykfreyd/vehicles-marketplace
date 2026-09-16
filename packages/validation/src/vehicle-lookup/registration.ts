import { z } from 'zod';

/**
 * plans/10-dvla-lookup-seller-matching.md §3 — a deliberately **permissive**
 * format check, not a strict regex matching every historical UK plate
 * format (current "AB12 CDE", prefix "A123 BCD", suffix "ABC 123D",
 * dateless "123 ABC"/"ABC 123", Northern Ireland, etc.). DVLA's own
 * "not found" response is the real validator (§6); this just rejects
 * obvious junk (empty input, punctuation) before a request is even sent.
 */
export function normalizeRegistration(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export const RegistrationInputSchema = z
  .string()
  .min(1, 'Enter a registration number')
  .transform((value) => normalizeRegistration(value))
  .refine((value) => /^[A-Z0-9]{2,8}$/.test(value), {
    message: 'Enter a valid-looking registration number',
  });

export type RegistrationInput = z.infer<typeof RegistrationInputSchema>;
