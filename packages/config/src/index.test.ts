import { describe, expect, it } from 'vitest';
import { loadEnv } from './index';

describe('loadEnv', () => {
  it('defaults NODE_ENV to development when unset', () => {
    expect(loadEnv({})).toEqual({ NODE_ENV: 'development' });
  });

  it('passes through a valid NODE_ENV', () => {
    expect(loadEnv({ NODE_ENV: 'production' })).toEqual({ NODE_ENV: 'production' });
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => loadEnv({ NODE_ENV: 'bogus' })).toThrow();
  });
});
