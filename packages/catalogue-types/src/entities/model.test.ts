import { describe, expect, it } from 'vitest';
import { ModelSchema } from './model';

describe('ModelSchema', () => {
  it('accepts a valid model', () => {
    expect(ModelSchema.safeParse({ id: 'bmw-m4', makeId: 'bmw', name: 'M4' }).success).toBe(true);
  });

  it('rejects a missing makeId', () => {
    expect(ModelSchema.safeParse({ id: 'bmw-m4', name: 'M4' }).success).toBe(false);
  });
});
