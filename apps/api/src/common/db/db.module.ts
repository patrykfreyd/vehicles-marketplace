/**
 * Makes packages/db's shared `PrismaClient` singleton available anywhere in
 * the Nest DI graph as an injectable provider — the "Prisma client
 * consumed as an injectable provider" this app was already built expecting
 * (see plans/05-backend-api-foundation.md §7/§11, and
 * plans/06-database-schema-migrations-baseline.md, which owns the client
 * itself). `@Global()` so no future module needs to import `DbModule` just
 * to `@Inject(DB)` — the same reasoning `ConfigModule.forRoot({
 * isGlobal: true })` already uses in AppModule.
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
