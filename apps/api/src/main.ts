import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from '@vehicles-marketplace/config';
import { AppModule } from './app.module';
import { buildCorsOrigins } from './common/security/cors';
import { setupSwaggerUi } from './swagger';

async function bootstrap(): Promise<void> {
  // Buffer logs until the pino-backed Logger below takes over, so nothing
  // during module init is lost to Nest's default console logger.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService<Env, true>);

  // URI-prefixed from day one (§3) — cheap now, painful to retrofit once
  // mobile has a hardcoded base URL in app-store review.
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({ origin: buildCorsOrigins({ APP_URL: config.get('APP_URL', { infer: true }) }) });
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
