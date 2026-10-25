import { env } from "./src/config/env.js";

export default {
  client: "pg",
  connection: env.DATABASE_URL,
  pool: { min: 0, max: 10 },
  migrations: {
    directory: "./src/db/migrations",
    tableName: "knex_migrations",
  },
};
