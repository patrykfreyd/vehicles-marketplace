/**
 * Checks Postgres connectivity for `GET /api/v1/health` (§3's health-check
 * decision). Opens a fresh, short-lived client per check rather than
 * holding a pool — health checks are infrequent and this plan deliberately
 * has no Prisma client yet (that's Plan 06); a persistent connection is a
 * later plan's call to make once one exists to share.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Client } from 'pg';
import type { Env } from '@vehicles-marketplace/config';

const CHECK_TIMEOUT_MS = 3_000;

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const client = new Client({
          connectionString: this.configService.get('DATABASE_URL', { infer: true }),
        });
        await client.connect();
        try {
          await client.query('SELECT 1');
        } finally {
          await client.end();
        }
      })
      .withTimeout(CHECK_TIMEOUT_MS);
  }
}
