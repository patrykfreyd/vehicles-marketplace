// The one `dto/` example every future module template copies (§5): wrap a
// `packages/validation` Zod schema with `createZodDto` so it drives both
// runtime response validation (via `@ZodResponse` on the controller) and
// the Swagger schema — never a hand-written OpenAPI schema.
import { createZodDto } from 'nestjs-zod';
import { ApiHealthCheckSchema } from '@vehicles-marketplace/validation';

export class HealthCheckResponseDto extends createZodDto(ApiHealthCheckSchema) {}
