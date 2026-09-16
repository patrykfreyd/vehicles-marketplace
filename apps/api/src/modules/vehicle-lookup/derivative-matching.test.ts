import { describe, expect, it } from 'vitest';
import { rankDerivativeCandidates, type RankableDerivative } from './derivative-matching';

// Mirrors catalogue/bmw/m4.json (Plan 08/09's own BMW M4 fixture): two F82
// (2014-2020) PETROL derivatives at 2979cc, one G82 (2021-) PETROL
// derivative at 2993cc — plus one unrelated-fuel derivative in G82 to prove
// the exact-fuel-match rule, and one same-generation, same-fuel, worse
// engine-capacity match to prove the ascending sort.
const F82_M4: RankableDerivative = {
  id: 'bmw-m4-f82-m4',
  name: 'M4',
  generationId: 'bmw-m4-f82',
  generationCode: 'F82',
  generationStartYear: 2014,
  generationEndYear: 2020,
  fuel: 'PETROL',
  engineCapacityCc: 2979,
  powerBhp: 425,
  drivetrain: 'RWD',
  transmissions: ['MANUAL', 'DCT'],
  bodyStyle: 'COUPE',
};

const F82_M4_COMPETITION: RankableDerivative = {
  ...F82_M4,
  id: 'bmw-m4-f82-m4-competition',
  name: 'M4 Competition',
  powerBhp: 444,
};

const G82_M4_COMPETITION_XDRIVE: RankableDerivative = {
  id: 'bmw-m4-g82-competition-xdrive',
  name: 'M4 Competition xDrive',
  generationId: 'bmw-m4-g82',
  generationCode: 'G82',
  generationStartYear: 2021,
  generationEndYear: null,
  fuel: 'PETROL',
  engineCapacityCc: 2993,
  powerBhp: 503,
  drivetrain: 'AWD',
  transmissions: ['AUTOMATIC'],
  bodyStyle: 'COUPE',
};

const G82_DIESEL_DECOY: RankableDerivative = {
  ...G82_M4_COMPETITION_XDRIVE,
  id: 'decoy-diesel',
  name: 'Decoy Diesel',
  fuel: 'DIESEL',
};

const ALL_DERIVATIVES = [F82_M4, F82_M4_COMPETITION, G82_M4_COMPETITION_XDRIVE, G82_DIESEL_DECOY];

describe('rankDerivativeCandidates', () => {
  it('ranks the G82 Competition xDrive above the F82 derivatives for a 2022 PETROL 2993cc lookup', () => {
    const ranked = rankDerivativeCandidates(ALL_DERIVATIVES, {
      year: 2022,
      fuel: 'PETROL',
      engineCapacityCc: 2993,
    });

    expect(ranked[0]?.id).toBe(G82_M4_COMPETITION_XDRIVE.id);
    expect(ranked[0]?.engineCapacityDiffCc).toBe(0);
    expect(ranked[0]?.withinTolerance).toBe(true);
    // F82 derivatives are excluded outright — their generation doesn't
    // cover 2022 — not merely ranked lower.
    expect(ranked.map((r) => r.id)).not.toContain(F82_M4.id);
    expect(ranked.map((r) => r.id)).not.toContain(F82_M4_COMPETITION.id);
  });

  it('excludes a same-generation candidate whose fuel does not match exactly', () => {
    const ranked = rankDerivativeCandidates(ALL_DERIVATIVES, {
      year: 2022,
      fuel: 'PETROL',
      engineCapacityCc: 2993,
    });
    expect(ranked.map((r) => r.id)).not.toContain(G82_DIESEL_DECOY.id);
  });

  it('includes both F82 derivatives, sorted ascending by engine-capacity closeness, for a 2016 lookup', () => {
    const ranked = rankDerivativeCandidates(ALL_DERIVATIVES, {
      year: 2016,
      fuel: 'PETROL',
      engineCapacityCc: 2979,
    });
    expect(ranked.map((r) => r.id)).toEqual([F82_M4.id, F82_M4_COMPETITION.id]);
    expect(ranked.every((r) => r.engineCapacityDiffCc === 0)).toBe(true);
  });

  it('returns nothing for a year no generation covers', () => {
    const ranked = rankDerivativeCandidates(ALL_DERIVATIVES, {
      year: 1999,
      fuel: 'PETROL',
      engineCapacityCc: 2993,
    });
    expect(ranked).toEqual([]);
  });

  it('returns nothing when the DVLA fuel could not be mapped at all', () => {
    const ranked = rankDerivativeCandidates(ALL_DERIVATIVES, {
      year: 2022,
      fuel: null,
      engineCapacityCc: 2993,
    });
    expect(ranked).toEqual([]);
  });

  it('sorts a candidate with no known engine capacity last, without excluding it', () => {
    const unknownCapacity: RankableDerivative = {
      ...G82_M4_COMPETITION_XDRIVE,
      id: 'unknown-capacity',
      engineCapacityCc: null,
    };
    const ranked = rankDerivativeCandidates([unknownCapacity, G82_M4_COMPETITION_XDRIVE], {
      year: 2022,
      fuel: 'PETROL',
      engineCapacityCc: 2993,
    });
    expect(ranked.map((r) => r.id)).toEqual([G82_M4_COMPETITION_XDRIVE.id, 'unknown-capacity']);
  });
});
