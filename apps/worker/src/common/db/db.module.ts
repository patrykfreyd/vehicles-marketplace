/**
 * Makes packages/db's shared `PrismaClient` singleton available anywhere in
 * this process's Nest DI graph as an injectable provider — see
 * apps/api/src/common/db/db.module.ts (the same module, duplicated per app
 * rather than shared, since `apps/api`/`apps/worker` don't share a
 * `packages/*` module of their own; only their source tree, per
 * plans/05-backend-api-foundation.md §6). `@Global()` so no future queue
 * processor needs to import `DbModule` just to `@Inject(DB)`.
 */
import { Global, Module } from '@nestjs/common';
import { db } from '@vehicles-marketplace/db';

export const DB = Symbol('DB');

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DbModule {}
