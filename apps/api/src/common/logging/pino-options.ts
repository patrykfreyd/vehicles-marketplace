/**
 * `nestjs-pino` config — structured JSON logs everywhere, pretty-printed
 * only in Local for human eyes (§3's logging decision). `pino-http`'s
 * built-in request logging (method/path/status/duration, one line per
 * completed request) already satisfies §8's "request-logging interceptor"
 * requirement, so there's no separate custom interceptor for it.
 *
 * The one request-correlation ID per request (§3) is `genReqId` below: it
 * reuses an inbound `X-Request-Id` (so a request can be traced across
 * services that also set one) or mints a fresh one, and always echoes it
 * back on the response so a client/support ticket can quote it.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { Env } from '@vehicles-marketplace/config';

function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const header = req.headers['x-request-id'];
  const id = typeof header === 'string' && header.length > 0 ? header : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

export function buildPinoHttpParams(env: Pick<Env, 'APP_ENV'>): Params {
  return {
    pinoHttp: {
      level: env.APP_ENV === 'local' ? 'debug' : 'info',
      genReqId,
      transport:
        env.APP_ENV === 'local'
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
          : undefined,
    },
  };
}
