import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createHealthCheck } from '@vehicles-marketplace/validation';
import { AppModule } from './app.module';

const HEARTBEAT_INTERVAL_MS = 30_000;

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule);
  console.log(`worker started: ${JSON.stringify(createHealthCheck())}`);

  // No real queues/processors yet (see the notifications/messaging plans
  // for background jobs) — this heartbeat just proves the process boots
  // and stays alive as a persistent worker, like apps/api.
  setInterval(() => {
    console.log(`worker heartbeat: ${JSON.stringify(createHealthCheck())}`);
  }, HEARTBEAT_INTERVAL_MS);
}

void bootstrap();
