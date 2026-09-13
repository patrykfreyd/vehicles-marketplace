import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { Logger } from 'nestjs-pino';
import { z } from 'zod';
import { ApiErrorSchema } from '@vehicles-marketplace/validation';
import { ApiExceptionFilter } from './api-exception.filter';

function buildHost() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  const response = { status, json };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function buildFilter() {
  const logger = { setContext: vi.fn(), error: vi.fn() } as unknown as Logger;
  return { filter: new ApiExceptionFilter(logger), logger };
}

describe('ApiExceptionFilter', () => {
  it('shapes a Zod validation failure into a 400 VALIDATION_ERROR with fieldErrors', () => {
    const { filter } = buildFilter();
    const { host, status, json } = buildHost();

    const schema = z.object({ age: z.number() });
    const zodError = schema.safeParse({ age: 'not-a-number' }).error!;

    filter.catch(new ZodValidationException(zodError), host);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0]![0];
    expect(() => ApiErrorSchema.parse(body)).not.toThrow();
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(body.fieldErrors).toHaveProperty('age');
  });

  it('passes a deliberate 4xx HttpException’s message through as-is', () => {
    const { filter } = buildFilter();
    const { host, status, json } = buildHost();

    filter.catch(new NotFoundException('Vehicle not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ code: 'NOT_FOUND', message: 'Vehicle not found' });
  });

  it('maps a 403 to FORBIDDEN and a generic 400 to VALIDATION_ERROR', () => {
    const { filter } = buildFilter();

    const forbidden = buildHost();
    filter.catch(new ForbiddenException('No access'), forbidden.host);
    expect(forbidden.json).toHaveBeenCalledWith({ code: 'FORBIDDEN', message: 'No access' });

    const badRequest = buildHost();
    filter.catch(new BadRequestException('Bad input'), badRequest.host);
    expect(badRequest.json).toHaveBeenCalledWith({
      code: 'VALIDATION_ERROR',
      message: 'Bad input',
    });
  });

  it('masks a 5xx HttpException’s detail and logs it in full', () => {
    const { filter, logger } = buildFilter();
    const { host, status, json } = buildHost();

    const internal = new Error('leaked stack detail');
    filter.catch(internal, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: internal }),
      'Unhandled exception',
    );
  });

  it('masks a thrown non-Error value the same way', () => {
    const { filter } = buildFilter();
    const { host, status, json } = buildHost();

    filter.catch('a string was thrown', host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });
});
