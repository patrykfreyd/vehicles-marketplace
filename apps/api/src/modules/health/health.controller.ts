import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiHealthCheckSchema, type ApiHealthCheck } from '@vehicles-marketplace/validation';
import { Public } from '../auth/public.decorator';
import { HealthCheckResponseDto } from './dto/health-check-response.dto';
import { HealthService } from './health.service';

// Supersedes Plan 01's placeholder `/health` (§9) — real Postgres/Redis
// connectivity checks, a Zod-validated body on success, and a 503 ApiError
// on failure via the global ApiExceptionFilter when a check fails.
//
// `@Public()` (Plan 07): deploy scripts (Plan 02/35) poll this to confirm a
// new release is up *before* promoting traffic — it can't require a session
// to answer that.
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
  ) {}

  @Public()
  @Get()
  // Swagger doc comes from the createZodDto-backed HealthCheckResponseDto
  // (§5's DTO pattern) instead of Terminus's own auto-generated schema, so
  // this endpoint demonstrates the same Zod-drives-Swagger pattern every
  // other module's endpoints use.
  //
  // This parses manually rather than using nestjs-zod's `@ZodResponse` —
  // Terminus's `HealthCheckResult` return type is generic enough (its
  // `info`/`error` fields are `Partial<...>`, so TS sees "possibly
  // undefined" values that the schema's inferred type doesn't allow) that
  // `@ZodResponse`'s compile-time return-type check can't be satisfied
  // without `as any`-ing the return value away — parsing directly gets the
  // same runtime guarantee with an exact result type instead.
  @HealthCheck({ swaggerDocumentation: false })
  @ApiOkResponse({ description: 'Service health', type: HealthCheckResponseDto })
  async check(): Promise<ApiHealthCheck> {
    const result = await this.health.check(this.healthService.getIndicators());
    return ApiHealthCheckSchema.parse(result);
  }
}
