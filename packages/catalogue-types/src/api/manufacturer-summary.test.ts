import { describe, expect, it } from 'vitest';
import { ManufacturerListQuerySchema, ManufacturerSummarySchema } from './manufacturer-summary';

describe('ManufacturerSummarySchema', () => {
  it('accepts a valid summary', () => {
    const result = ManufacturerSummarySchema.safeParse({
      id: 'bmw',
      name: 'BMW',
      modelCount: 1,
      derivativeCount: 3,
      averageCompleteness: 83,
      priorityScore: 17,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a completeness above 100', () => {
    const result = ManufacturerSummarySchema.safeParse({
      id: 'bmw',
      name: 'BMW',
      modelCount: 1,
      derivativeCount: 3,
      averageCompleteness: 120,
      priorityScore: 17,
    });
    expect(result.success).toBe(false);
  });
});

describe('ManufacturerListQuerySchema', () => {
  it('defaults sort to priority', () => {
    const result = ManufacturerListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.sort).toBe('priority');
  });

  it('rejects an unknown sort value', () => {
    expect(ManufacturerListQuerySchema.safeParse({ sort: 'popularity' }).success).toBe(false);
  });
});
