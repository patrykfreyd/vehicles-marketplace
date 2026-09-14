import { describe, expect, it } from 'vitest';
import { IssueSeveritySchema } from './issue-severity';

describe('IssueSeveritySchema', () => {
  it('accepts every documented severity', () => {
    for (const value of ['WARNING', 'ERROR']) {
      expect(IssueSeveritySchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(IssueSeveritySchema.safeParse('warning').success).toBe(false);
    expect(IssueSeveritySchema.safeParse('CRITICAL').success).toBe(false);
  });
});
