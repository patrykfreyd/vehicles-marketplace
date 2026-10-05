/**
 * The real-vs-fake selection, factored out of `image-processing.module.ts`'s
 * `useFactory` so it's unit-testable directly — same reasoning as
 * `dvla-client.factory.ts`.
 */
import type { VisionAiClient } from './vision-ai-client';
import { FakeVisionAiClient } from './vision-ai-client.fake';
import { OpenAiVisionClient } from './vision-ai-client.openai';

export interface VisionAiClientFactoryOptions {
  apiKey: string;
  model: string;
}

export function buildVisionAiClient(options: VisionAiClientFactoryOptions): VisionAiClient {
  if (!options.apiKey) return new FakeVisionAiClient();
  return new OpenAiVisionClient({ apiKey: options.apiKey, model: options.model });
}
