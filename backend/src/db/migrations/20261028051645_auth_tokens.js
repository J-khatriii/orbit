export const up = async (knex) => {
  await knex.schema.createTable("auth_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("type").notNullable();
    table.text("token_hash").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("used_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "type"]);
  });

  await knex.raw(
    `ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_type_check CHECK (type IN ('email_verification', 'password_reset'))`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("auth_tokens");
};
