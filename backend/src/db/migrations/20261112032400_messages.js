export const up = async (knex) => {
  await knex.schema.createTable("messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("client_id").notNullable();
    // Optional: which of the client's projects this message is about.
    table.uuid("project_id");
    table.uuid("author_id").references("id").inTable("users").onDelete("SET NULL");
    table.text("body").notNullable();
    // Internal notes are for the team only. The client portal never returns them.
    table.boolean("internal").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(["client_id", "workspace_id"], "messages_client_fk")
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");

    // The conversation query: one client's messages, newest first.
    table.index(["client_id", "created_at", "id"], "messages_conversation_idx");
  });

  await knex.raw(
    `ALTER TABLE messages ADD CONSTRAINT messages_body_check
     CHECK (char_length(body) BETWEEN 1 AND 5000)`,
  );
  // If the project is deleted, the message stays and only the project tag is cleared.
  // "SET NULL (project_id)" needs Postgres 15 or newer. You're on 17.
  await knex.raw(
    `ALTER TABLE messages ADD CONSTRAINT messages_project_fk
     FOREIGN KEY (project_id, workspace_id)
     REFERENCES projects (id, workspace_id)
     ON DELETE SET NULL (project_id)`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("messages");
};
