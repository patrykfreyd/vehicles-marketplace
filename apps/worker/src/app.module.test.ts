import { describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('boots a standalone Nest application context', async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    expect(app).toBeDefined();
    await app.close();
  });
});
