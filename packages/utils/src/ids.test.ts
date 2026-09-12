import { describe, expect, it } from 'vitest';
import { createId } from './ids';

describe('createId', () => {
  it('prefixes a 26-character Crockford-base32 ULID', () => {
    const id = createId('veh');
    expect(id).toMatch(/^veh_[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('produces a different ID on every call', () => {
    expect(createId('veh')).not.toBe(createId('veh'));
  });

  it('carries the given prefix regardless of entity type', () => {
    expect(createId('usr').startsWith('usr_')).toBe(true);
    expect(createId('lst').startsWith('lst_')).toBe(true);
  });
});
