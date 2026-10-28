import knex from "knex";
import { assertSafeTestDatabase, TEST_DATABASE_URL } from "./testDatabase.js";

// Runs once before all tests: make sure the test database has the latest tables.
export const setup = async () => {
  assertSafeTestDatabase();

  const db = knex({
    client: "pg",
    connection: TEST_DATABASE_URL,
    migrations: { directory: `${import.meta.dirname}/../src/db/migrations` },
  });

  try {
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
};
