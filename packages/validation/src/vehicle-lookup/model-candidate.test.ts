import { describe, expect, it } from 'vitest';
import { ListModelCandidatesQuerySchema, ModelCandidateSchema } from './model-candidate';

describe('ModelCandidateSchema', () => {
  it('accepts a valid candidate', () => {
    expect(ModelCandidateSchema.safeParse({ id: 'bmw-m4', name: 'M4' }).success).toBe(true);
  });
});

describe('ListModelCandidatesQuerySchema', () => {
  it('requires makeId', () => {
    expect(ListModelCandidatesQuerySchema.safeParse({}).success).toBe(false);
  });

  it('accepts an optional q filter', () => {
    const result = ListModelCandidatesQuerySchema.safeParse({ makeId: 'bmw', q: 'M4' });
    expect(result.success).toBe(true);
  });
});
