import { describe, expect, it } from 'vitest';
import type { Options } from 'pino-http';
import { buildPinoHttpParams } from './pino-options';

// buildPinoHttpParams always returns a plain `pinoHttp` options object (never
// the destination-stream or tuple forms `Params['pinoHttp']` also allows),
// so tests can assert against that shape directly.
function getPinoHttpOptions(env: Parameters<typeof buildPinoHttpParams>[0]): Options {
  return buildPinoHttpParams(env).pinoHttp as Options;
}

describe('buildPinoHttpParams', () => {
  it('pretty-prints and logs at debug level in local', () => {
    const options = getPinoHttpOptions({ APP_ENV: 'local' });
    expect(options).toMatchObject({ level: 'debug', transport: { target: 'pino-pretty' } });
  });

  it('logs raw JSON at info level outside local', () => {
    for (const APP_ENV of ['test', 'production'] as const) {
      const options = getPinoHttpOptions({ APP_ENV });
      expect(options).toMatchObject({ level: 'info', transport: undefined });
    }
  });

  it('reuses an inbound X-Request-Id and echoes it back on the response', () => {
    const { genReqId } = getPinoHttpOptions({ APP_ENV: 'local' });
    expect(genReqId).toBeTypeOf('function');

    const headers: Record<string, string> = {};
    const req = { headers: { 'x-request-id': 'incoming-id' } };
    const res = { setHeader: (name: string, value: string) => (headers[name] = value) };
    const id = genReqId!(req as never, res as never) as string;

    expect(id).toBe('incoming-id');
    expect(headers['X-Request-Id']).toBe('incoming-id');
  });

  it('mints a fresh id when none was sent', () => {
    const { genReqId } = getPinoHttpOptions({ APP_ENV: 'local' });

    const headers: Record<string, string> = {};
    const req = { headers: {} };
    const res = { setHeader: (name: string, value: string) => (headers[name] = value) };
    const id = genReqId!(req as never, res as never) as string;

    expect(id).toEqual(expect.any(String));
    expect(id.length).toBeGreaterThan(0);
    expect(headers['X-Request-Id']).toBe(id);
  });
});
