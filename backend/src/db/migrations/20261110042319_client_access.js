export const up = async (knex) => {
  await knex.schema.createTable("client_access", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("client_id").notNullable();
    // The person who can see this client's portal. Their workspace role must be "client";
    // the service checks that, and workspaceContext checks they are still an active member.
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.uuid("granted_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // The client must be in the same workspace as this row.
    table
      .foreign(["client_id", "workspace_id"], "client_access_client_fk")
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");

    // A person is linked to a client once.
    table.unique(["client_id", "user_id"], { indexName: "client_access_unique" });
    // "Which clients can this user see in this workspace?"
    table.index(["workspace_id", "user_id"], "client_access_user_idx");
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("client_access");
};
