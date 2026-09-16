import { describe, expect, it } from 'vitest';
import { FakeDvlaClient } from './dvla-client.fake';
import { buildDvlaClient } from './dvla-client.factory';
import { DvlaHttpClient } from './dvla-client.http';

describe('buildDvlaClient', () => {
  it('returns the fake client when DVLA_API_KEY is blank', () => {
    const client = buildDvlaClient({ apiKey: '', baseUrl: 'https://dvla.example/vehicles' });
    expect(client).toBeInstanceOf(FakeDvlaClient);
  });

  it('returns the real HTTP client once an API key is set', () => {
    const client = buildDvlaClient({
      apiKey: 'a-real-key',
      baseUrl: 'https://dvla.example/vehicles',
    });
    expect(client).toBeInstanceOf(DvlaHttpClient);
  });
});
