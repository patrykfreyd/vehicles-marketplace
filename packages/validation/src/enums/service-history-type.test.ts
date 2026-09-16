import { describe, expect, it } from 'vitest';
import { ServiceHistoryTypeSchema } from './service-history-type';

describe('ServiceHistoryTypeSchema', () => {
  it('accepts every documented value', () => {
    for (const value of ['FULL', 'PARTIAL', 'NONE', 'UNKNOWN']) {
      expect(ServiceHistoryTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(ServiceHistoryTypeSchema.safeParse('full').success).toBe(false);
    expect(ServiceHistoryTypeSchema.safeParse('PART').success).toBe(false);
  });
});
