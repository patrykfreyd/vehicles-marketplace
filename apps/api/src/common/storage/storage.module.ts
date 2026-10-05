/**
 * Makes `packages/storage`'s `StorageService` available anywhere in this
 * process's Nest DI graph — see `apps/worker/src/common/storage/storage.module.ts`
 * (the same module, duplicated per app, same reasoning as `common/db/db.module.ts`).
 * Always `LocalStorageService` for now (§2); a future S3 implementation
 * swaps what this factory returns without touching any injector.
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@vehicles-marketplace/config';
import { LocalStorageService } from '@vehicles-marketplace/storage';
import { STORAGE_SERVICE } from './storage.tokens';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new LocalStorageService({
          uploadRoot: config.get('UPLOAD_ROOT', { infer: true }),
          publicUploadUrl: config.get('PUBLIC_UPLOAD_URL', { infer: true }),
        }),
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
