import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AiExtractionSchema,
  AiMessageRequestSchema,
  AiSearchFilterSchema,
  mergeAiFilters,
} from './index';

const emptyPatch = Object.fromEntries(
  Object.keys(AiSearchFilterSchema.shape).map((key) => [key, null]),
);
const extraction = (filters: object, clearFields: string[] = []) =>
  AiExtractionSchema.parse({
    filters: { ...emptyPatch, ...filters },
    clearFields,
    clarifyingQuestion: null,
    criteria: null,
  });
describe('AI search contract', () => {
  it('keeps all previous filters on a budget refinement and clears only explicitly removed fields', () => {
    const original = {
      bodyStyle: ['ESTATE' as const],
      maxPricePence: 3000000,
      minYear: 2021,
      equipmentIds: ['adaptive_cruise'],
    };
    const narrowed = mergeAiFilters(original, extraction({ maxPricePence: 2700000 }));
    expect(narrowed).toEqual({ ...original, maxPricePence: 2700000 });
    expect(mergeAiFilters(narrowed, extraction({}, ['equipmentIds']))).toEqual({
      bodyStyle: ['ESTATE'],
      maxPricePence: 2700000,
      minYear: 2021,
    });
  });
  it('rejects contradictory merged ranges and AI pagination/sort controls', () => {
    expect(() =>
      mergeAiFilters({ minPricePence: 3000000 }, extraction({ maxPricePence: 2700000 })),
    ).toThrow();
    expect(AiSearchFilterSchema.safeParse({ sort: 'PRICE_DESC', page: 1 }).success).toBe(false);
    expect(
      AiExtractionSchema.safeParse({ filters: { ...emptyPatch, searchId: 'invented' } }).success,
    ).toBe(false);
  });
  it('bounds user input and uses UUID session identifiers', () => {
    for (const message of ['', '   ', 'a'.repeat(2001)])
      expect(AiMessageRequestSchema.safeParse({ message }).success).toBe(false);
    expect(
      AiMessageRequestSchema.safeParse({ message: 'car', sessionId: '../other' }).success,
    ).toBe(false);
  });
  it('generates strict-compatible JSON schema with all properties required recursively', () => {
    const json = z.toJSONSchema(AiExtractionSchema);
    function check(value: unknown) {
      if (!value || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      if (node.type === 'object') {
        expect(node.additionalProperties).toBe(false);
        expect(node.required).toEqual(Object.keys(node.properties as object));
      }
      Object.values(node).forEach((v) => (Array.isArray(v) ? v.forEach(check) : check(v)));
    }
    check(json);
  });
});
