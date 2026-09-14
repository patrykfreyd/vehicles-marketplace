import { describe, expect, it } from 'vitest';
import { ManufacturerDetailSchema } from './manufacturer-detail';

describe('ManufacturerDetailSchema', () => {
  it('accepts a manufacturer with models and generations, matching the idea doc §32 tree', () => {
    const result = ManufacturerDetailSchema.safeParse({
      id: 'bmw',
      name: 'BMW',
      models: [
        {
          id: 'bmw-m4',
          name: 'M4',
          generations: [
            {
              id: 'bmw-m4-g82',
              code: 'G82',
              productionStartYear: 2021,
              derivativeCount: 1,
              completeCount: 1,
              inProgressCount: 0,
              warningCount: 0,
              averageCompleteness: 100,
              derivatives: [
                {
                  id: 'bmw-m4-g82-competition-xdrive',
                  name: 'M4 Competition xDrive',
                  status: 'APPROVED',
                  completenessScore: 100,
                  hasOpenIssue: false,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a model with no id', () => {
    const result = ManufacturerDetailSchema.safeParse({
      id: 'bmw',
      name: 'BMW',
      models: [{ name: 'M4', generations: [] }],
    });
    expect(result.success).toBe(false);
  });
});
