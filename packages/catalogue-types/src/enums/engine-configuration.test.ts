import { describe, expect, it } from 'vitest';
import { EngineConfigurationSchema } from './engine-configuration';

describe('EngineConfigurationSchema', () => {
  it('accepts every documented configuration', () => {
    for (const value of [
      'INLINE_3',
      'INLINE_4',
      'INLINE_5',
      'INLINE_6',
      'V6',
      'V8',
      'V10',
      'V12',
      'FLAT_4',
      'FLAT_6',
      'ELECTRIC_MOTOR',
    ]) {
      expect(EngineConfigurationSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(EngineConfigurationSchema.safeParse('v6').success).toBe(false);
    expect(EngineConfigurationSchema.safeParse('W12').success).toBe(false);
  });
});
