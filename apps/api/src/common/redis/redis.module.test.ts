import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS, RedisModule } from './redis.module';

describe('RedisModule', () => {
  it('provides an ioredis client under the REDIS token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ REDIS_URL: 'redis://localhost:6379' })],
        }),
        RedisModule,
      ],
    }).compile();

    const redis = moduleRef.get<Redis>(REDIS);
    expect(redis).toBeDefined();
    expect(typeof redis.incr).toBe('function');
    redis.disconnect();
  });
});
