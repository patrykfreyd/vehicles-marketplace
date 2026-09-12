import { describe, expect, it } from 'vitest';
import { getStartupMessage } from './cli';

describe('getStartupMessage', () => {
  it('reports itself alive with a validated health payload', () => {
    expect(getStartupMessage()).toMatch(/catalogue-cli: alive \(\{"status":"ok"/);
  });
});
