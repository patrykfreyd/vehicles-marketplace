import { describe, expect, it } from 'vitest';
import { computeCompletenessScore, missingCompletenessFields } from './completeness';

describe('computeCompletenessScore', () => {
  it('reproduces the idea doc §33 100% example (BMW G82 M4 Competition xDrive)', () => {
    const score = computeCompletenessScore({
      engineCapacityCc: 2993,
      cylinders: 6,
      configuration: 'INLINE_6',
      aspiration: 'TWIN_TURBO',
      engineFamily: 'S58',
      powerBhp: 503,
      torqueNm: 650,
      transmissions: ['AUTOMATIC'],
      zeroToSixtyTwoSeconds: 3.5,
      topSpeedMph: 180,
    });
    expect(score).toBe(100);
  });

  it('scores a record missing torque/engine family/0-62 at 70% (see module comment vs. idea doc §33)', () => {
    const score = computeCompletenessScore({
      engineCapacityCc: 1968,
      cylinders: 4,
      configuration: 'INLINE_4',
      aspiration: 'TURBO',
      engineFamily: undefined,
      powerBhp: 148,
      torqueNm: undefined,
      transmissions: ['AUTOMATIC'],
      zeroToSixtyTwoSeconds: undefined,
      topSpeedMph: 130,
    });
    expect(score).toBe(70);
  });

  it('treats an empty transmissions array as absent, not present', () => {
    const score = computeCompletenessScore({
      engineCapacityCc: 1968,
      cylinders: 4,
      configuration: 'INLINE_4',
      aspiration: 'TURBO',
      engineFamily: 'EA888',
      powerBhp: 148,
      torqueNm: 320,
      transmissions: [],
      zeroToSixtyTwoSeconds: 8.1,
      topSpeedMph: 130,
    });
    expect(score).toBe(90);
  });

  it('scores a bare-minimum record (everything optional missing) at 0%', () => {
    const score = computeCompletenessScore({
      engineCapacityCc: undefined,
      cylinders: undefined,
      configuration: undefined,
      aspiration: undefined,
      engineFamily: undefined,
      powerBhp: undefined,
      torqueNm: undefined,
      transmissions: [],
      zeroToSixtyTwoSeconds: undefined,
      topSpeedMph: undefined,
    });
    expect(score).toBe(0);
  });
});

describe('missingCompletenessFields', () => {
  it('lists exactly the fields the 70%-complete example is missing', () => {
    expect(
      missingCompletenessFields({
        engineCapacityCc: 1968,
        cylinders: 4,
        configuration: 'INLINE_4',
        aspiration: 'TURBO',
        engineFamily: undefined,
        powerBhp: 148,
        torqueNm: undefined,
        transmissions: ['AUTOMATIC'],
        zeroToSixtyTwoSeconds: undefined,
        topSpeedMph: 130,
      }),
    ).toEqual(['engineFamily', 'torqueNm', 'zeroToSixtyTwoSeconds']);
  });

  it('returns an empty array for a fully complete record', () => {
    expect(
      missingCompletenessFields({
        engineCapacityCc: 2993,
        cylinders: 6,
        configuration: 'INLINE_6',
        aspiration: 'TWIN_TURBO',
        engineFamily: 'S58',
        powerBhp: 503,
        torqueNm: 650,
        transmissions: ['AUTOMATIC'],
        zeroToSixtyTwoSeconds: 3.5,
        topSpeedMph: 180,
      }),
    ).toEqual([]);
  });
});
