export const up = async (knex) => {
  await knex.schema.createTable("activity_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    // Who did it. Kept as null if that person's account is ever deleted.
    table.uuid("actor_id").references("id").inTable("users").onDelete("SET NULL");
    table.text("entity_type").notNullable();
    table.uuid("entity_id").notNullable();
    // The client this event belongs to, so a client's feed is one fast query.
    table.uuid("client_id");
    table.text("action").notNullable();
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Same safety as contacts: the client must be in the same workspace.
    table
      .foreign(["client_id", "workspace_id"])
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");
    table.index(["workspace_id", "created_at"]);
    table.index(["workspace_id", "client_id", "created_at"]);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("activity_log");
};
