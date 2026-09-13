/**
 * The one global exception filter every response — a Zod validation
 * failure, a deliberately-thrown `HttpException`, or a genuine bug — passes
 * through, per plans/05-backend-api-foundation.md §4. It's the only place
 * in the app that's allowed to shape an `ApiError` response body, so every
 * module reuses this instead of hand-rolling its own error JSON.
 *
 * Two different trust levels, deliberately kept apart:
 *  - A 4xx `HttpException` is something our own code threw on purpose
 *    (`NotFoundException('Vehicle not found')`, a Zod validation failure,
 *    `ThrottlerGuard` rejecting a request) — its `message` was written to
 *    be shown to a user, so it passes through as-is.
 *  - Anything that resolves to a 5xx — an uncaught exception, or even an
 *    `HttpException` a bug produced (e.g. `ZodSerializationException` when
 *    a handler's return value doesn't match its own response DTO) — is
 *    logged in full (via the request-scoped pino `Logger`) but never
 *    echoes its detail back to the client; the toast-safe generic message
 *    and the diagnostic log are deliberately different things.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { ApiErrorSchema, type ApiError } from '@vehicles-marketplace/validation';
import { z } from 'zod';

const GENERIC_SERVER_MESSAGE = 'Something went wrong';

/** Extends plans/03's fixed §6 code list with one addition this plan needs:
 * `SERVICE_UNAVAILABLE` for a 503 (Terminus's health check failing), which
 * §4 explicitly allows in place of `INTERNAL_ERROR`. */
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

function codeForStatus(status: number): string {
  if (STATUS_CODE_MAP[status]) return STATUS_CODE_MAP[status];
  return status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const fieldErrors =
        zodError instanceof z.ZodError ? z.flattenError(zodError).fieldErrors : undefined;
      this.respond(response, 400, {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fieldErrors: fieldErrors as Record<string, string[]> | undefined,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status < 500) {
        this.respond(response, status, {
          code: codeForStatus(status),
          message: exception.message,
        });
        return;
      }
      this.logger.error({ err: exception, status }, 'Unhandled HttpException (5xx)');
      this.respond(response, status, {
        code: codeForStatus(status),
        message: GENERIC_SERVER_MESSAGE,
      });
      return;
    }

    this.logger.error({ err: exception }, 'Unhandled exception');
    this.respond(response, 500, { code: 'INTERNAL_ERROR', message: GENERIC_SERVER_MESSAGE });
  }

  private respond(response: Response, status: number, body: ApiError): void {
    response.status(status).json(ApiErrorSchema.parse(body));
  }
}
