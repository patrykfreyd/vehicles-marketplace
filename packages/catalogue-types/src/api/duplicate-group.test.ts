import { describe, expect, it } from 'vitest';
import { DuplicateGroupResponseSchema } from './duplicate-group';

describe('DuplicateGroupResponseSchema', () => {
  it('accepts a group of two candidates', () => {
    const result = DuplicateGroupResponseSchema.safeParse({
      key: 'm4 competition xdrive|g82|COUPE|PETROL|AWD|503',
      items: [
        {
          id: 'bmw-m4-g82-competition-xdrive',
          name: 'M4 Competition xDrive',
          generationCode: 'G82',
          bodyStyle: 'COUPE',
          fuel: 'PETROL',
          drivetrain: 'AWD',
          powerBhp: 503,
        },
        {
          id: 'bmw-m4-g82-competition-xdrive-2',
          name: 'M4  Competition, xDrive',
          generationCode: 'G82',
          bodyStyle: 'COUPE',
          fuel: 'PETROL',
          drivetrain: 'AWD',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a group with no key', () => {
    const result = DuplicateGroupResponseSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
