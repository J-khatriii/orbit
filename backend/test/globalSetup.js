import knex from "knex";
import { assertSafeTestDatabase, getTestDatabaseName, TEST_DATABASE_URL } from "./testDatabase.js";

// Creates the test database if it doesn't exist yet. We connect to the built-in
// "postgres" database to do that, because you can't create a database from inside itself
const ensureDatabaseExists = async () => {
  const name = getTestDatabaseName();
  const adminUrl = new URL(TEST_DATABASE_URL);

  adminUrl.pathname = "/postgres";

  const admin = knex({ client: "pg", connection: adminUrl.toString() });

  try {
    const found = await admin.raw("SELECT 1 FROM pg_database WHERE datname = ?", [name]);

    if (found.rows.length === 0) {
      await admin.raw(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await admin.destroy();
  }
};

// Runs once before all tests: make sure the test database exists and is up to date.
export const setup = async () => {
  assertSafeTestDatabase();
  await ensureDatabaseExists();

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
