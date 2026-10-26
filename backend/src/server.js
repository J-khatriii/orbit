import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { db } from "./db/knex.js";

try {
  await db.raw("select 1");
  logger.info("Database connected");
} catch (err) {
  logger.fatal({ err }, "Database connection failed");
  process.exit(1);
}

const server = app.listen(env.PORT, () => {
  logger.info(`Orbit server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
  setTimeout(() => {
    return process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => {
  return shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  return shutdown("SIGINT");
});
