import { describe, expect, it } from 'vitest';
import { AspirationSchema } from './aspiration';

describe('AspirationSchema', () => {
  it('accepts every documented aspiration type', () => {
    for (const value of [
      'NATURALLY_ASPIRATED',
      'TURBO',
      'TWIN_TURBO',
      'SUPERCHARGED',
      'ELECTRIC',
    ]) {
      expect(AspirationSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(AspirationSchema.safeParse('turbo').success).toBe(false);
    expect(AspirationSchema.safeParse('BI_TURBO').success).toBe(false);
  });
});
