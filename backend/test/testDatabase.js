export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://orbit:orbit_dev_password@localhost:5432/orbit_test";

export const getTestDatabaseName = () => {
  return new URL(TEST_DATABASE_URL).pathname.slice(1);
};

export const assertSafeTestDatabase = () => {
  const name = getTestDatabaseName();

  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `Refusing to run tests against the database "${name}". ` +
        `Its name must be lowercase letters, digits or underscores, and end with "_test".`,
    );
  }
};
