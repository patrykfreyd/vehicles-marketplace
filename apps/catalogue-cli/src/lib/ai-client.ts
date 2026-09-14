/**
 * plans/09-catalogue-import-tooling-admin.md §3 — "AI provider wrapper":
 * a provider-agnostic `AiClient` interface, one concrete implementation for
 * now (OpenAI — §10.3), so `catalogue enrich` (and whatever Plan 14 later
 * builds for AI Search) doesn't hard-code a specific provider's SDK. AI is
 * used here strictly for "research assistance, extraction, normalization,
 * candidate generation" (idea doc §21) — `enrich.command.ts` runs every
 * candidate this returns through the exact same Zod schema a human-authored
 * file goes through before it's trusted at all.
 */

export interface DraftDerivativesRequest {
  make: string;
  model: string;
  generationCode: string;
  /** Free-text material to extract candidate derivatives from — a press release excerpt, a spec-sheet table, notes, etc. */
  sourceDescription: string;
  /** How many derivative candidates to draft. */
  count: number;
}

export interface AiClient {
  /** Returns raw, unvalidated candidate objects — the caller (`enrich.command.ts`) is responsible for running each one through `DerivativeStagingSchema` before it's written anywhere. */
  draftDerivatives(request: DraftDerivativesRequest): Promise<unknown[]>;
}

export class AiClientError extends Error {}
