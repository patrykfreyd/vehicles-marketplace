import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

const logger = new Logger('worker');

async function bootstrap(): Promise<void> {
  // No HTTP listener — this is a pure queue-consumer process (§6). BullMQ's
  // Worker keeps its own Redis connection open, which is what keeps the
  // Node process alive; no heartbeat/setInterval is needed for that anymore.
  await NestFactory.createApplicationContext(WorkerModule);
  logger.log('worker started');
}

void bootstrap();
