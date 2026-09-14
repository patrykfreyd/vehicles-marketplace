import { describe, expect, it } from 'vitest';
import {
  buildDerivativeId,
  buildGenerationId,
  buildMakeId,
  buildModelId,
  slugifyPart,
} from './slugs';

describe('slugifyPart', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyPart('BMW')).toBe('bmw');
    expect(slugifyPart('M4 Competition xDrive')).toBe('m4-competition-xdrive');
  });

  it('strips punctuation and stray hyphens', () => {
    expect(slugifyPart('M4  Competition, xDrive!')).toBe('m4-competition-xdrive');
    expect(slugifyPart('-Leading and trailing-')).toBe('leading-and-trailing');
  });
});

describe('buildMakeId / buildModelId / buildGenerationId', () => {
  it('matches the plan/fixture worked example', () => {
    const makeId = buildMakeId('BMW');
    const modelId = buildModelId(makeId, 'M4');
    const generationId = buildGenerationId(modelId, 'G82');
    expect(makeId).toBe('bmw');
    expect(modelId).toBe('bmw-m4');
    expect(generationId).toBe('bmw-m4-g82');
  });
});

describe('buildDerivativeId', () => {
  const generationId = 'bmw-m4-g82';

  it('strips the leading model-name word when the derivative name repeats it', () => {
    expect(buildDerivativeId(generationId, 'M4', 'M4 Competition xDrive')).toBe(
      'bmw-m4-g82-competition-xdrive',
    );
  });

  it('falls back to the full slug when the derivative name IS the model name', () => {
    expect(buildDerivativeId(generationId, 'M4', 'M4')).toBe('bmw-m4-g82-m4');
  });

  it('keeps the full slug when the derivative name does not repeat the model name', () => {
    expect(buildDerivativeId(generationId, 'M4', 'Competition')).toBe('bmw-m4-g82-competition');
  });
});
