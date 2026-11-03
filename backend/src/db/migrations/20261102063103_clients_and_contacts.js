export const up = async (knex) => {
  await knex.schema.createTable("clients", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.specificType("company_name", "citext").notNullable();
    table.text("status").notNullable().defaultTo("lead");
    table.specificType("billing_email", "citext");
    table.text("billing_address");
    table.text("tax_id");
    table.specificType("currency", "char(3)");
    table.text("notes_internal");
    table.specificType("tags", "text[]").notNullable().defaultTo("{}");
    table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("archived_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Lets contacts point at (id, workspace_id) together. See the contacts table below.
    table.unique(["id", "workspace_id"]);
    table.index(["workspace_id", "status"]);
  });

  await knex.raw(
    `ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('lead', 'active', 'past'))`,
  );
  await knex.raw(
    `ALTER TABLE clients ADD CONSTRAINT clients_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$')`,
  );

  // No two active clients in a workspace may share a name.
  await knex.raw(
    `CREATE UNIQUE INDEX clients_unique_active_name
     ON clients (workspace_id, company_name)
     WHERE archived_at IS NULL`,
  );

  // Makes "find clients with this tag" fast.
  await knex.raw(`CREATE INDEX clients_tags_idx ON clients USING GIN (tags)`);

  await knex.schema.createTable("contacts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("client_id").notNullable();
    // Set later, when this person is given access to the client portal.
    table.uuid("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.text("name").notNullable();
    table.specificType("email", "citext");
    table.text("phone");
    table.text("job_title");
    table.boolean("is_primary").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // The contact's workspace must be the same as its client's workspace.
    table
      .foreign(["client_id", "workspace_id"])
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");
    table.index(["workspace_id", "client_id"]);
  });

  // At most one primary contact per client.
  await knex.raw(
    `CREATE UNIQUE INDEX contacts_one_primary_per_client
     ON contacts (client_id)
     WHERE is_primary`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("contacts");
  await knex.schema.dropTableIfExists("clients");
};
