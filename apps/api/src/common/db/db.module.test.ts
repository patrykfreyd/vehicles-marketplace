import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { db } from '@vehicles-marketplace/db';
import { DB, DbModule } from './db.module';

describe('DbModule', () => {
  it("provides packages/db's shared client under the DB token", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DbModule],
    }).compile();

    // Same singleton, not a second client — proves DI hands out the one
    // shared connection pool rather than constructing its own.
    expect(moduleRef.get(DB)).toBe(db);
  });
});
