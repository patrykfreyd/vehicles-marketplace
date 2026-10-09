import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@vehicles-marketplace/config';
import { AiExtractionSchema } from '@vehicles-marketplace/validation';
import { extraction } from './ai-search.fixtures';

const { create, construct } = vi.hoisted(() => ({ create: vi.fn(), construct: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create } };
    constructor(options: unknown) {
      construct(options);
    }
  },
}));
import { AiSearchProvider } from './ai-search.provider';

function provider(key = 'test-secret') {
  return new AiSearchProvider(
    new ConfigService({
      OPENAI_API_KEY: key,
      OPENAI_SEARCH_MODEL: 'gpt-5.6-luna',
    }) as ConfigService<Env, true>,
  );
}
function response(args: unknown = extraction({ maxPricePence: 3000000 })) {
  return {
    choices: [
      {
        finish_reason: 'tool_calls',
        message: {
          tool_calls: [
            { type: 'function', function: { name: 'resolve', arguments: JSON.stringify(args) } },
          ],
        },
      },
    ],
    usage: { prompt_tokens: 1000, completion_tokens: 100 },
  };
}
describe('OpenAI strict extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('forces a strict tool, disables storage and parallel tools, and records cost without prompt data', async () => {
    create.mockResolvedValueOnce(response());
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const result = await provider().call(
      'AI_SEARCH',
      'EXTRACT',
      AiExtractionSchema,
      'private prompt',
      { message: 'personal data' },
    );
    expect(result.filters.maxPricePence).toBe(3000000);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.6-luna',
        store: false,
        parallel_tool_calls: false,
        tool_choice: { type: 'function', function: { name: 'resolve' } },
        tools: [expect.objectContaining({ function: expect.objectContaining({ strict: true }) })],
      }),
    );
    expect(construct).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0, timeout: 20000 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'AI_CALL',
        inputTokens: 1000,
        outputTokens: 100,
        success: true,
        estimatedCostUsd: 0.00032,
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private prompt|personal data|test-secret/);
    log.mockRestore();
  });
  it('retries once on timeout and then succeeds', async () => {
    create.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(response());
    await provider().call('AI_SEARCH', 'EXTRACT', AiExtractionSchema, '', {});
    expect(create).toHaveBeenCalledTimes(2);
  });
  it.each(['malformed', 'refused', 'truncated', 'wrong tool'])(
    'rejects %s responses after at most two attempts',
    async (kind) => {
      const value = response(kind === 'malformed' ? { not: 'valid' } : undefined);
      if (kind === 'refused') value.choices[0]!.message.tool_calls = [];
      if (kind === 'truncated') value.choices[0]!.finish_reason = 'length';
      if (kind === 'wrong tool')
        value.choices[0]!.message.tool_calls[0]!.function.name = 'query_database';
      create.mockResolvedValue(value);
      await expect(
        provider().call('AI_SEARCH', 'EXTRACT', AiExtractionSchema, '', {}),
      ).rejects.toThrow('AI provider unavailable');
      expect(create).toHaveBeenCalledTimes(2);
    },
  );
  it('fails gracefully without an API key and never makes a paid request', async () => {
    await expect(
      provider('').call('AI_SEARCH', 'EXTRACT', AiExtractionSchema, '', {}),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
