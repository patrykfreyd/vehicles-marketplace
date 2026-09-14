import { describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: class FakeOpenAi {
    chat = { completions: { create: createMock } };
  },
}));

const { OpenAiClient } = await import('./openai-client');
const { AiClientError } = await import('./ai-client');

function mockResponse(content: string) {
  createMock.mockResolvedValueOnce({ choices: [{ message: { content } }] });
}

describe('OpenAiClient.draftDerivatives', () => {
  it('parses a well-formed derivatives array out of the response content', async () => {
    mockResponse(
      JSON.stringify({
        derivatives: [
          { name: 'M4 Competition xDrive', bodyStyle: 'COUPE', fuel: 'PETROL', drivetrain: 'AWD' },
        ],
      }),
    );

    const client = new OpenAiClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    const result = await client.draftDerivatives({
      make: 'BMW',
      model: 'M4',
      generationCode: 'G82',
      sourceDescription: 'press release text',
      count: 1,
    });

    expect(result).toEqual([
      { name: 'M4 Competition xDrive', bodyStyle: 'COUPE', fuel: 'PETROL', drivetrain: 'AWD' },
    ]);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', response_format: { type: 'json_object' } }),
    );
  });

  it('throws AiClientError when the response has no content', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const client = new OpenAiClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(
      client.draftDerivatives({
        make: 'BMW',
        model: 'M4',
        generationCode: 'G82',
        sourceDescription: 'x',
        count: 1,
      }),
    ).rejects.toBeInstanceOf(AiClientError);
  });

  it('throws AiClientError when the content is not valid JSON', async () => {
    mockResponse('not json');
    const client = new OpenAiClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(
      client.draftDerivatives({
        make: 'BMW',
        model: 'M4',
        generationCode: 'G82',
        sourceDescription: 'x',
        count: 1,
      }),
    ).rejects.toBeInstanceOf(AiClientError);
  });

  it('throws AiClientError when the JSON has no derivatives array', async () => {
    mockResponse(JSON.stringify({ oops: true }));
    const client = new OpenAiClient({ apiKey: 'test-key', model: 'gpt-4o-mini' });
    await expect(
      client.draftDerivatives({
        make: 'BMW',
        model: 'M4',
        generationCode: 'G82',
        sourceDescription: 'x',
        count: 1,
      }),
    ).rejects.toBeInstanceOf(AiClientError);
  });
});
