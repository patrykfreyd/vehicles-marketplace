/**
 * OpenAPI generation and Swagger UI mounting — §7/§8/§12.3.
 *
 * `buildOpenApiDocument` is used two ways from one place, so they can never
 * drift apart:
 *  - `setupSwaggerUi` (below), mounted on the live app in Local/Test.
 *  - `scripts/generate-openapi.ts`, which writes it to `openapi.json` for
 *    `packages/api-client`'s `openapi-typescript` step to consume.
 *
 * Swagger UI itself (§12.3, resolved): mounted in Local with no auth, and
 * in Test behind HTTP basic auth (`SWAGGER_USER`/`SWAGGER_PASSWORD`) since
 * Test is reachable over the internet even though it's not meant for
 * public use; never mounted in Production.
 */
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import type { Env } from '@vehicles-marketplace/config';

const SWAGGER_UI_PATH = 'api/docs';
// SwaggerModule.setup() also exposes the raw spec at this sibling path by
// default — it needs the same basic-auth gate as the UI itself, since it
// isn't nested under SWAGGER_UI_PATH.
const SWAGGER_JSON_PATH = `${SWAGGER_UI_PATH}-json`;

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Vehicles Marketplace API')
    .setDescription(
      'Modular-monolith REST API for the vehicles marketplace — see plans/05-backend-api-foundation.md.',
    )
    .setVersion('1.0')
    .build();
  return SwaggerModule.createDocument(app, config);
}

export type SwaggerEnv = Pick<Env, 'APP_ENV' | 'SWAGGER_USER' | 'SWAGGER_PASSWORD'>;

export function setupSwaggerUi(app: INestApplication, env: SwaggerEnv): void {
  if (env.APP_ENV === 'production') return;

  if (env.APP_ENV === 'test') {
    if (!env.SWAGGER_USER || !env.SWAGGER_PASSWORD) {
      throw new Error(
        'SWAGGER_USER and SWAGGER_PASSWORD must both be set to mount Swagger UI in Test.',
      );
    }
    app.use(
      [`/${SWAGGER_UI_PATH}`, `/${SWAGGER_JSON_PATH}`],
      basicAuth({ users: { [env.SWAGGER_USER]: env.SWAGGER_PASSWORD }, challenge: true }),
    );
  }

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup(SWAGGER_UI_PATH, app, document);
}
