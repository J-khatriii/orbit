export const up = async (knex) => {
  await knex.schema.createTable("files", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("client_id").notNullable();
    // Optional: which of the client's projects this file is for.
    table.uuid("project_id");
    table.uuid("uploaded_by").references("id").inTable("users").onDelete("SET NULL");
    // The name to show people. The stored file is named by its id, never by this.
    table.text("name").notNullable();
    // Worked out from the file's own bytes, not from what the browser said.
    table.text("content_type").notNullable();
    table.integer("size_bytes").notNullable();
    table.text("storage_key").notNullable();
    // Whether the client portal may show and serve this file.
    table.boolean("client_visible").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(["client_id", "workspace_id"], "files_client_fk")
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");

    // A client's files, newest first.
    table.index(["client_id", "created_at"], "files_client_idx");
  });

  await knex.raw(
    `ALTER TABLE files ADD CONSTRAINT files_name_check
     CHECK (char_length(name) BETWEEN 1 AND 200)`,
  );
  await knex.raw(
    `ALTER TABLE files ADD CONSTRAINT files_size_check
     CHECK (size_bytes BETWEEN 1 AND 104857600)`,
  );
  // If the project is deleted, the file stays and only the project tag is cleared.
  // "SET NULL (project_id)" needs Postgres 15 or newer. You're on 17.
  await knex.raw(
    `ALTER TABLE files ADD CONSTRAINT files_project_fk
     FOREIGN KEY (project_id, workspace_id)
     REFERENCES projects (id, workspace_id)
     ON DELETE SET NULL (project_id)`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("files");
};
