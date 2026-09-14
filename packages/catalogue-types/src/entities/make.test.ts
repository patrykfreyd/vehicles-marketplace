import { describe, expect, it } from 'vitest';
import { MakeSchema } from './make';

describe('MakeSchema', () => {
  it('accepts a valid make', () => {
    expect(MakeSchema.safeParse({ id: 'bmw', name: 'BMW' }).success).toBe(true);
  });

  it('rejects a non-slug id', () => {
    expect(MakeSchema.safeParse({ id: 'BMW', name: 'BMW' }).success).toBe(false);
  });
});
