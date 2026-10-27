export const up = async (knex) => {
  await knex.schema.createTable("sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("token_hash").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("last_used_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("user_agent");
    table.text("ip_address");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["user_id"]);
    table.index(["expires_at"]);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("sessions");
};
