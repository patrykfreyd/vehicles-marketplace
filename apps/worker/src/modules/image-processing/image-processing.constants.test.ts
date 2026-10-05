import { describe, expect, it } from 'vitest';
import { resolveClassifiedCategory } from './image-processing.constants';

describe('resolveClassifiedCategory', () => {
  it('keeps the AI category when confidence is at or above the threshold', () => {
    expect(resolveClassifiedCategory({ category: 'ENGINE', confidence: 0.7 })).toBe('ENGINE');
    expect(resolveClassifiedCategory({ category: 'ENGINE', confidence: 0.95 })).toBe('ENGINE');
  });

  it('defaults to OTHER below the 70% confidence threshold rather than guessing', () => {
    expect(resolveClassifiedCategory({ category: 'ENGINE', confidence: 0.69 })).toBe('OTHER');
    expect(resolveClassifiedCategory({ category: 'EXTERIOR', confidence: 0 })).toBe('OTHER');
  });
});
