/**
 * Proves `pnpm db:seed` works end-to-end (plans/06-database-schema-migrations-baseline.md
 * §5) — inserts exactly one test `User`, idempotently. Real domain seed
 * data (catalogue fixtures, sample vehicles/listings) is added
 * incrementally by the plan that introduces that data need (Plan 08, Plan
 * 11, ...), each appending its own step to `main()` below rather than
 * replacing this one.
 */
import { createId } from '@vehicles-marketplace/utils';
import { db } from '@vehicles-marketplace/db';

const TEST_USER_EMAIL = 'test@example.com';

async function main() {
  // `upsert` on the unique `email` is what makes running this twice safe:
  // the first run creates the row, every run after just leaves it alone.
  const user = await db.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: {
      id: createId('usr'),
      email: TEST_USER_EMAIL,
      displayName: 'Test User',
    },
  });

  console.log(`Seeded user ${user.id} (${user.email})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
