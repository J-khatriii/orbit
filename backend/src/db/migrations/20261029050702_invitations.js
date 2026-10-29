export const up = async (knex) => {
  await knex.schema.createTable("invitations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.specificType("email", "citext").notNullable();
    table.text("role").notNullable();
    table.text("token_hash").notNullable().unique();
    table.uuid("invited_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("accepted_at", { useTz: true });
    table.timestamp("revoked_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["workspace_id"]);
  });

  await knex.raw(
    `ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'member', 'client'))`,
  );

  // At most one open invitation per email per workspace.
  await knex.raw(
    `CREATE UNIQUE INDEX invitations_one_pending_per_email
     ON invitations (workspace_id, email)
     WHERE accepted_at IS NULL AND revoked_at IS NULL`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("invitations");
};
