/**
 * The fixture-backed `VisionAiClient` used in Local/Test (selected by
 * `vision-ai-client.factory.ts` whenever `OPENAI_API_KEY` is blank) — same
 * reasoning as `DvlaClient`'s fake: the whole pipeline (resize, store,
 * classify, reach `DONE`) works end-to-end without a real OpenAI account.
 *
 * Unlike DVLA's fake (keyed by registration text), there's no natural text
 * key for an image — these fixtures are keyed by exact buffer content
 * instead, so a processor test can exercise the low-confidence/error paths
 * deterministically by passing one of these exact buffers.
 */
import type { VisionAiClassification, VisionAiClient } from './vision-ai-client';
import { VisionAiClientError } from './vision-ai-client';

export const FIXTURE_LOW_CONFIDENCE_IMAGE = Buffer.from('VISION_FIXTURE_LOW_CONFIDENCE');
export const FIXTURE_ERROR_IMAGE = Buffer.from('VISION_FIXTURE_ERROR');

export class FakeVisionAiClient implements VisionAiClient {
  async classify(image: Buffer): Promise<VisionAiClassification> {
    if (image.equals(FIXTURE_ERROR_IMAGE)) {
      throw new VisionAiClientError('Simulated vision AI outage (fixture)');
    }
    if (image.equals(FIXTURE_LOW_CONFIDENCE_IMAGE)) {
      return { category: 'OTHER', confidence: 0.42 };
    }
    // Default: confidently EXTERIOR — enough to exercise the DONE path for
    // any photo not specifically testing the low-confidence/error branches.
    return { category: 'EXTERIOR', confidence: 0.95 };
  }
}
