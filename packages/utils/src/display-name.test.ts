import { describe, expect, it } from 'vitest';
import { deriveDisplayNameFromEmail } from './display-name';

describe('deriveDisplayNameFromEmail', () => {
  it('title-cases the local part of a simple email', () => {
    expect(deriveDisplayNameFromEmail('john@example.com')).toBe('John');
  });

  it('splits on dots/underscores/hyphens into separate words', () => {
    expect(deriveDisplayNameFromEmail('john.doe@example.com')).toBe('John Doe');
    expect(deriveDisplayNameFromEmail('jane_doe@example.com')).toBe('Jane Doe');
    expect(deriveDisplayNameFromEmail('jane-doe@example.com')).toBe('Jane Doe');
  });

  it('falls back to the whole string when there is no @', () => {
    expect(deriveDisplayNameFromEmail('standalone')).toBe('Standalone');
  });
});
