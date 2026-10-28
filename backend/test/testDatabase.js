export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://orbit:orbit_dev_password@localhost:5432/orbit_test";

// The tests delete every row in every table. Never let that happen to real data.
export const assertSafeTestDatabase = () => {
  const name = new URL(TEST_DATABASE_URL).pathname.slice(1);

  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against the database "${name}". Its name must end with "_test".`,
    );
  }
};
