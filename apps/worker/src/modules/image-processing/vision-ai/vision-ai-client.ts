/**
 * plans/12-image-upload-processing-pipeline.md §6 — "`VisionAiClient` is a
 * provider-agnostic interface (mirroring Plan 09's `AiClient`) with one
 * concrete implementation". Same shape as `apps/api`'s `DvlaClient`: a real
 * implementation (`vision-ai-client.openai.ts`) and a fixture-backed fake
 * (`vision-ai-client.fake.ts`), selected by `vision-ai-client.factory.ts`.
 */
import type { MediaCategory } from '@vehicles-marketplace/validation';

export interface VisionAiClassification {
  category: MediaCategory;
  /** 0-1. The processor (not this client) is what defaults low-confidence results to OTHER — see §3's "AI classification confidence" decision. */
  confidence: number;
}

/** Thrown for anything going wrong talking to the vision provider — network failure, malformed response, etc. The processor's retry/backoff (§6) is what recovers from this, not this client itself. */
export class VisionAiClientError extends Error {}

export interface VisionAiClient {
  classify(image: Buffer): Promise<VisionAiClassification>;
}
