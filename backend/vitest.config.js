import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./test/testDatabase.js";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/globalSetup.js"],
    setupFiles: ["./test/setup.js"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: TEST_DATABASE_URL,
      STRIPE_SECRET_KEY: "sk_test_vitest_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_vitest_placeholder",
    },
    // All test files share one database, so they run one after another.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
