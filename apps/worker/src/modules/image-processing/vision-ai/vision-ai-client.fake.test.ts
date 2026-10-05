import { describe, expect, it } from 'vitest';
import {
  FakeVisionAiClient,
  FIXTURE_ERROR_IMAGE,
  FIXTURE_LOW_CONFIDENCE_IMAGE,
} from './vision-ai-client.fake';
import { VisionAiClientError } from './vision-ai-client';

describe('FakeVisionAiClient', () => {
  const client = new FakeVisionAiClient();

  it('classifies an arbitrary image confidently as EXTERIOR', async () => {
    await expect(client.classify(Buffer.from('any-image-bytes'))).resolves.toEqual({
      category: 'EXTERIOR',
      confidence: 0.95,
    });
  });

  it('classifies the low-confidence fixture below the 70% threshold', async () => {
    const result = await client.classify(FIXTURE_LOW_CONFIDENCE_IMAGE);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('throws for the error fixture', async () => {
    await expect(client.classify(FIXTURE_ERROR_IMAGE)).rejects.toThrow(VisionAiClientError);
  });
});
