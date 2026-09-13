/**
 * Writes `apps/api/openapi.json` from the live Nest route/DTO metadata —
 * the first half of the §7 pipeline (`packages/api-client`'s
 * `generate:api-client` script consumes this file). Run via
 * `pnpm --filter api generate:openapi`, or `pnpm generate:api-client` from
 * the root, which runs this first.
 *
 * Boots the app with `NestFactory.create` (not `createApplicationContext`)
 * because `SwaggerModule.createDocument` needs a real HTTP adapter to
 * introspect controller routes from — it never calls `.listen()`, though,
 * so this never needs a free port or live Postgres/Redis (the health
 * indicators only connect when actually invoked, not at DI construction).
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/swagger';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const document = buildOpenApiDocument(app);
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  console.log(`Wrote ${outPath}`);
}

void main();
