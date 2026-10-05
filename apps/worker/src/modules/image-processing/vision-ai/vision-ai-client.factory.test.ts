import { describe, expect, it } from 'vitest';
import { FakeVisionAiClient } from './vision-ai-client.fake';
import { buildVisionAiClient } from './vision-ai-client.factory';
import { OpenAiVisionClient } from './vision-ai-client.openai';

describe('buildVisionAiClient', () => {
  it('returns the fake client when OPENAI_API_KEY is blank', () => {
    const client = buildVisionAiClient({ apiKey: '', model: 'gpt-4o-mini' });
    expect(client).toBeInstanceOf(FakeVisionAiClient);
  });

  it('returns the real OpenAI client once an API key is set', () => {
    const client = buildVisionAiClient({ apiKey: 'a-real-key', model: 'gpt-4o-mini' });
    expect(client).toBeInstanceOf(OpenAiVisionClient);
  });
});
