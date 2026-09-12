import { describe, expect, it } from 'vitest';
import { DrivetrainSchema } from './drivetrain';

describe('DrivetrainSchema', () => {
  it('accepts every documented drivetrain type', () => {
    for (const value of ['FWD', 'RWD', 'AWD']) {
      expect(DrivetrainSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects a lowercase or unknown value', () => {
    expect(DrivetrainSchema.safeParse('fwd').success).toBe(false);
    expect(DrivetrainSchema.safeParse('4WD').success).toBe(false);
  });
});
