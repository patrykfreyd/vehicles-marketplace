import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckSchema,
  createHealthCheck,
  type HealthCheck,
} from '@vehicles-marketplace/validation';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): HealthCheck {
    // Re-validated at the boundary even though createHealthCheck() already
    // returns a valid payload — proves the endpoint is actually enforcing
    // the shared schema, not just trusting the helper that built it.
    return HealthCheckSchema.parse(createHealthCheck());
  }
}
