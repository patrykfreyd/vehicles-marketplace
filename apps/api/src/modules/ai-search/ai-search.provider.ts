import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@vehicles-marketplace/config';
import OpenAI from 'openai';
import { z } from 'zod';

export type AiFeature = 'AI_SEARCH' | 'AI_CAR_FINDER';
export class AiProviderError extends Error {}

@Injectable()
export class AiSearchProvider {
  private readonly logger = new Logger(AiSearchProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly configured: boolean;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.configured = Boolean(apiKey);
    this.model = config.get('OPENAI_SEARCH_MODEL', { infer: true });
    this.client = new OpenAI({ apiKey: apiKey || 'unconfigured', maxRetries: 0, timeout: 20_000 });
  }

  async call<T>(
    feature: AiFeature,
    phase: 'EXTRACT' | 'EXPLAIN',
    schema: z.ZodType<T>,
    instructions: string,
    context: unknown,
  ): Promise<T> {
    // Exactly one bounded retry, including invalid/refused/truncated responses.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const start = Date.now();
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;
      let success = false;
      try {
        if (!this.configured) throw new AiProviderError('AI is not configured');
        const response = await this.client.chat.completions.create({
          model: this.model,
          store: false,
          reasoning_effort: 'low',
          max_completion_tokens: 3000,
          parallel_tool_calls: false,
          tools: [
            {
              type: 'function',
              function: {
                name: 'resolve',
                description: 'Return the validated structured result.',
                strict: true,
                parameters: z.toJSONSchema(schema),
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'resolve' } },
          messages: [
            { role: 'system', content: instructions },
            { role: 'user', content: JSON.stringify(context) },
          ],
        });
        inputTokens = response.usage?.prompt_tokens ?? null;
        outputTokens = response.usage?.completion_tokens ?? null;
        const choice = response.choices[0];
        const calls = choice?.message.tool_calls;
        const call = calls?.[0];
        if (
          choice?.finish_reason !== 'tool_calls' ||
          choice.message.refusal ||
          calls?.length !== 1 ||
          call?.type !== 'function' ||
          call.function.name !== 'resolve'
        ) {
          throw new AiProviderError('Missing complete tool response');
        }
        const parsed = schema.parse(JSON.parse(call.function.arguments) as unknown);
        success = true;
        return parsed;
      } catch {
        if (attempt === 2 || !this.configured) throw new AiProviderError('AI provider unavailable');
      } finally {
        // No prompts, session IDs, user data, credentials or provider error bodies.
        // Null cost for model overrides: do not misreport another model's pricing.
        this.logger.log({
          event: 'AI_CALL',
          feature,
          phase,
          model: this.model,
          attempt,
          latencyMs: Date.now() - start,
          inputTokens,
          outputTokens,
          estimatedCostUsd:
            this.model === 'gpt-5.6-luna' && inputTokens !== null && outputTokens !== null
              ? (inputTokens * 0.2 + outputTokens * 1.2) / 1_000_000
              : null,
          costBasis: 'uncached-list-price',
          success,
        });
      }
    }
    throw new AiProviderError('AI provider unavailable');
  }
}
