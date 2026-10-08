import { describe, expect, it } from 'vitest';
import { extractPostcodeArea, UkPostcodeSchema } from './postcode';

describe('UkPostcodeSchema', () => {
  it('accepts well-formed postcodes with or without internal spacing', () => {
    expect(UkPostcodeSchema.safeParse('SK11 9DL').success).toBe(true);
    expect(UkPostcodeSchema.safeParse('SK119DL').success).toBe(true);
    expect(UkPostcodeSchema.safeParse('EC1A 1BB').success).toBe(true);
    expect(UkPostcodeSchema.safeParse('SW1A 1AA').success).toBe(true);
  });

  it('rejects obviously-malformed input', () => {
    expect(UkPostcodeSchema.safeParse('not a postcode').success).toBe(false);
    expect(UkPostcodeSchema.safeParse('').success).toBe(false);
    expect(UkPostcodeSchema.safeParse('1234567').success).toBe(false);
  });
});

describe('extractPostcodeArea', () => {
  it('returns the leading letters, uppercased', () => {
    expect(extractPostcodeArea('SK11 9DL')).toBe('SK');
    expect(extractPostcodeArea('ec1a 1bb')).toBe('EC');
    expect(extractPostcodeArea('sw1a 1aa')).toBe('SW');
  });

  it('returns an empty string when there is no leading letter run', () => {
    expect(extractPostcodeArea('123')).toBe('');
  });
});
