/**
 * The one concrete `AiClient` (§3) for now — OpenAI, per §10.3 ("we'll use
 * OpenAI for starter, cheapest model that will work for us"; see
 * `OPENAI_MODEL`'s default in `@vehicles-marketplace/config`).
 *
 * Uses plain JSON-object mode (`response_format: { type: 'json_object' }`)
 * rather than OpenAI's stricter JSON-Schema structured-output mode: that
 * mode requires every property `required` with `additionalProperties:
 * false`, which doesn't map cleanly onto a schema built from mostly-
 * optional Level 2 fields without flattening away the very
 * optionality `DerivativeStagingSchema` encodes. The actual safety net is
 * unconditional either way — every candidate this returns is re-validated
 * against that exact schema by `enrich.command.ts` (idea doc §21: "AI
 * output must pass through the same validation, not a shortcut") — so a
 * looser response mode plus a strict prompt is the pragmatic choice here,
 * not a weaker one.
 */
import OpenAI from 'openai';
import type { AiClient, DraftDerivativesRequest } from './ai-client';
import { AiClientError } from './ai-client';

const SYSTEM_PROMPT = `You are a UK car-catalogue research assistant. Given a manufacturer, model, generation, and source material, extract candidate vehicle derivatives (trim/engine variants) as strict JSON.

Respond with a JSON object of the exact shape:
{ "derivatives": [ { ... } ] }

Each derivative object may only use these fields (omit any you cannot determine from the source material — never invent a value):
- name (string, required): e.g. "M4 Competition xDrive"
- specialEdition (boolean)
- bodyStyle (one of: HATCHBACK, SALOON, ESTATE, COUPE, CONVERTIBLE, SUV, MPV, PICKUP) (required)
- doors (integer)
- seats (integer)
- fuel (one of: PETROL, DIESEL, HYBRID, PHEV, ELECTRIC, HYDROGEN) (required)
- engineCapacityCc (integer)
- cylinders (integer)
- configuration (one of: INLINE_3, INLINE_4, INLINE_5, INLINE_6, V6, V8, V10, V12, FLAT_4, FLAT_6, ELECTRIC_MOTOR)
- aspiration (one of: NATURALLY_ASPIRATED, TURBO, TWIN_TURBO, SUPERCHARGED, ELECTRIC)
- engineFamily (string)
- powerBhp (integer)
- torqueNm (integer)
- transmissions (array of: MANUAL, AUTOMATIC, DCT, CVT)
- drivetrain (one of: FWD, RWD, AWD) (required)
- drivetrainManufacturerName (string)
- zeroToSixtyTwoSeconds (number)
- topSpeedMph (integer)
- aliases (array of strings)

Never include "status", "confidence", "reviewed", or "completenessScore" — those are set by the importer, not by you. Only extract what the source material actually states; leave a field out entirely rather than guessing.`;

export interface OpenAiClientOptions {
  apiKey: string;
  model: string;
}

export class OpenAiClient implements AiClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAiClientOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model;
  }

  async draftDerivatives(request: DraftDerivativesRequest): Promise<unknown[]> {
    const userPrompt = `Manufacturer: ${request.make}\nModel: ${request.model}\nGeneration: ${request.generationCode}\nDraft up to ${request.count} candidate derivative(s).\n\nSource material:\n${request.sourceDescription}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new AiClientError('OpenAI returned an empty response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiClientError('OpenAI returned a response that was not valid JSON');
    }

    const derivatives = (parsed as { derivatives?: unknown }).derivatives;
    if (!Array.isArray(derivatives)) {
      throw new AiClientError('OpenAI response did not contain a "derivatives" array');
    }
    return derivatives;
  }
}
