import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from '@vehicles-marketplace/config';
import { AppModule } from './app.module';
import { buildCorsOrigins } from './common/security/cors';
import { mountAuthHandler } from './modules/auth/auth.controller';
import { AUTH } from './modules/auth/auth.tokens';
import type { Auth } from './modules/auth/auth-instance';
import { setupSwaggerUi } from './swagger';

async function bootstrap(): Promise<void> {
  // Buffer logs until the pino-backed Logger below takes over, so nothing
  // during module init is lost to Nest's default console logger.
  //
  // `bodyParser: false` — Better Auth's handler (mounted below via
  // `mountAuthHandler`) reads the raw request body stream itself; Nest's
  // default global body parser would already have consumed it by the time
  // any middleware/controller saw the request. `json()`/`urlencoded()` are
  // re-added manually further down, *after* the auth mount, for every other
  // route — see auth.controller.ts's comment for the full explanation.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService<Env, true>);

  app.use(helmet());
  app.enableCors({
    origin: buildCorsOrigins({ APP_URL: config.get('APP_URL', { infer: true }) }),
    // Better Auth's session cookie must round-trip on cross-origin requests
    // between web (`{domain}`) and api (`api.{domain}`) — see Plan 07 §3.
    credentials: true,
  });

  // Mounted as raw Express middleware, *before* Nest's own router and body
  // parser — see auth.controller.ts's top comment for why this can't be a
  // Nest `@Controller()`.
  mountAuthHandler(app, app.get<Auth>(AUTH));
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // URI-prefixed from day one (§3) — cheap now, painful to retrofit once
  // mobile has a hardcoded base URL in app-store review.
  app.setGlobalPrefix('api/v1');
  setupSwaggerUi(app, {
    APP_ENV: config.get('APP_ENV', { infer: true }),
    SWAGGER_USER: config.get('SWAGGER_USER', { infer: true }),
    SWAGGER_PASSWORD: config.get('SWAGGER_PASSWORD', { infer: true }),
  });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`api listening on http://localhost:${port}`);
}

void bootstrap();
