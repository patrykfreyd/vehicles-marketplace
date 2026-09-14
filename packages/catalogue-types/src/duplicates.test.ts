import { describe, expect, it } from 'vitest';
import { buildDuplicateKey, findDuplicateCandidates, normalizeForDuplicateKey } from './duplicates';

describe('normalizeForDuplicateKey', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeForDuplicateKey('M4 Competition xDrive')).toBe('m4 competition xdrive');
    expect(normalizeForDuplicateKey('M4-Competition, xDrive!')).toBe('m4 competition xdrive');
    expect(normalizeForDuplicateKey('  M4   Competition ')).toBe('m4 competition');
  });
});

describe('buildDuplicateKey', () => {
  it('produces the same key for two differently-formatted entries of the same car', () => {
    const a = buildDuplicateKey({
      id: 'a',
      name: 'M4 Competition xDrive',
      generationCode: 'G82',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'AWD',
      powerBhp: 503,
    });
    const b = buildDuplicateKey({
      id: 'b',
      name: 'M4  Competition, xDrive',
      generationCode: 'g82',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'AWD',
      powerBhp: 503,
    });
    expect(a).toBe(b);
  });

  it('produces a different key when the generation differs', () => {
    const a = buildDuplicateKey({
      id: 'a',
      name: 'M4 Competition',
      generationCode: 'F82',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'RWD',
    });
    const b = buildDuplicateKey({
      id: 'b',
      name: 'M4 Competition',
      generationCode: 'G82',
      bodyStyle: 'COUPE',
      fuel: 'PETROL',
      drivetrain: 'RWD',
    });
    expect(a).not.toBe(b);
  });
});

describe('findDuplicateCandidates', () => {
  it('groups two near-identical derivatives and excludes a genuinely distinct one', () => {
    const items = [
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
        id: 'bmw-m4-g82-competition-xdrive-dupe',
        name: 'M4  Competition, xDrive',
        generationCode: 'G82',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'AWD',
        powerBhp: 503,
      },
      {
        id: 'bmw-m4-g82',
        name: 'M4',
        generationCode: 'G82',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'RWD',
        powerBhp: 480,
      },
    ];

    const groups = findDuplicateCandidates(items);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      'bmw-m4-g82-competition-xdrive',
      'bmw-m4-g82-competition-xdrive-dupe',
    ]);
  });

  it('returns no groups when every item is unique', () => {
    const items = [
      {
        id: 'a',
        name: 'M4',
        generationCode: 'F82',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'RWD',
      },
      {
        id: 'b',
        name: 'M4 Competition',
        generationCode: 'F82',
        bodyStyle: 'COUPE',
        fuel: 'PETROL',
        drivetrain: 'RWD',
      },
    ];
    expect(findDuplicateCandidates(items)).toHaveLength(0);
  });
});
