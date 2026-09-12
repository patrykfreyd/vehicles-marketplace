import { describe, expect, it } from 'vitest';
import { TransmissionSchema } from './transmission';

describe('TransmissionSchema', () => {
  it('accepts every documented transmission type', () => {
    for (const value of ['MANUAL', 'AUTOMATIC', 'DCT', 'CVT']) {
      expect(TransmissionSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(TransmissionSchema.safeParse('manual').success).toBe(false);
    expect(TransmissionSchema.safeParse('SEMI_AUTO').success).toBe(false);
  });
});
