import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';

describe('createApiClient', () => {
  it('builds a client that calls the health endpoint against the configured baseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', details: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createApiClient({ baseUrl: 'http://localhost:3001', fetch: fetchMock });
    const { data, error, response } = await client.GET('/api/v1/health');

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestUrl = fetchMock.mock.calls[0]![0].url as string;
    expect(requestUrl).toBe('http://localhost:3001/api/v1/health');
    expect(response.status).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toEqual({ status: 'ok', details: {} });
  });
});
