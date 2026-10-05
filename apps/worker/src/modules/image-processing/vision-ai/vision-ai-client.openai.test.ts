import { describe, expect, it, vi } from 'vitest';
import { VisionAiClientError } from './vision-ai-client';
import { OpenAiVisionClient } from './vision-ai-client.openai';

const createMock = vi.fn();

// Hoisted by vitest above the imports above, so `openai` resolves to this
// fake before OpenAiVisionClient's own `import OpenAI from 'openai'` runs.
vi.mock('openai', () => ({
  default: class FakeOpenAi {
    chat = { completions: { create: createMock } };
  },
}));

function mockResponse(content: string) {
  createMock.mockResolvedValueOnce({ choices: [{ message: { content } }] });
}

describe('OpenAiVisionClient.classify', () => {
  it('parses a well-formed classification out of the response content', async () => {
    mockResponse(JSON.stringify({ category: 'ENGINE', confidence: 0.88 }));

    const client = new OpenAiVisionClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    const result = await client.classify(Buffer.from('fake-webp-bytes'));

    expect(result).toEqual({ category: 'ENGINE', confidence: 0.88 });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', response_format: { type: 'json_object' } }),
    );
  });

  it('throws VisionAiClientError when the response has no content', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const client = new OpenAiVisionClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(client.classify(Buffer.from('x'))).rejects.toBeInstanceOf(VisionAiClientError);
  });

  it('throws VisionAiClientError when the content is not valid JSON', async () => {
    mockResponse('not json');
    const client = new OpenAiVisionClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(client.classify(Buffer.from('x'))).rejects.toBeInstanceOf(VisionAiClientError);
  });

  it('throws VisionAiClientError when category is not one of the controlled enum values', async () => {
    mockResponse(JSON.stringify({ category: 'SPACESHIP', confidence: 0.9 }));
    const client = new OpenAiVisionClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(client.classify(Buffer.from('x'))).rejects.toBeInstanceOf(VisionAiClientError);
  });

  it('throws VisionAiClientError when confidence is out of range', async () => {
    mockResponse(JSON.stringify({ category: 'EXTERIOR', confidence: 1.5 }));
    const client = new OpenAiVisionClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(client.classify(Buffer.from('x'))).rejects.toBeInstanceOf(VisionAiClientError);
  });
});
