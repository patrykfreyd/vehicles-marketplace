/**
 * The real `VisionAiClient` — OpenAI's vision-capable chat-completions API,
 * same JSON-object-mode approach as `apps/catalogue-cli`'s `OpenAiClient`
 * (§6's own comment on why: a strict JSON-Schema mode doesn't map cleanly
 * here either, and the actual safety net is `ClassificationResponseSchema`
 * below re-validating every response regardless of response mode).
 */
import OpenAI from 'openai';
import { z } from 'zod';
import { MediaCategorySchema } from '@vehicles-marketplace/validation';
import type { VisionAiClassification, VisionAiClient } from './vision-ai-client';
import { VisionAiClientError } from './vision-ai-client';

const SYSTEM_PROMPT = `You are classifying a single photo from a used-car listing into exactly one category.

Respond with a JSON object of the exact shape:
{ "category": "...", "confidence": 0.0 }

"category" must be one of: EXTERIOR, INTERIOR, ENGINE, BOOT, DAMAGE, DOCUMENT, OTHER.
- EXTERIOR: outside of the car (front, side, rear, wheels, badges)
- INTERIOR: cabin, seats, dashboard, infotainment
- ENGINE: engine bay with the bonnet open
- BOOT: boot/trunk space
- DAMAGE: visible scratches, dents, or other damage
- DOCUMENT: paperwork, service book, screenshots
- OTHER: anything that doesn't clearly fit the above

"confidence" is your confidence in that category, from 0 to 1. Never guess a specific category you're unsure about — use a low confidence value instead of picking a plausible-sounding one.`;

const ClassificationResponseSchema = z.object({
  category: MediaCategorySchema,
  confidence: z.number().min(0).max(1),
});

export interface OpenAiVisionClientOptions {
  apiKey: string;
  model: string;
}

export class OpenAiVisionClient implements VisionAiClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAiVisionClientOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model;
  }

  async classify(image: Buffer): Promise<VisionAiClassification> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Classify this car listing photo.' },
            {
              type: 'image_url',
              image_url: { url: `data:image/webp;base64,${image.toString('base64')}` },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new VisionAiClientError('OpenAI returned an empty response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new VisionAiClientError('OpenAI returned a response that was not valid JSON');
    }

    const result = ClassificationResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw new VisionAiClientError(
        'OpenAI response did not match the expected classification shape',
      );
    }
    return result.data;
  }
}
