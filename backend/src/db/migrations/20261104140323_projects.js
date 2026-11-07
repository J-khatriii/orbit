export const up = async (knex) => {
  await knex.schema.createTable("projects", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("client_id").notNullable();
    table.text("name").notNullable();
    table.text("description");
    table.text("status").notNullable().defaultTo("planned");
    table.date("start_date");
    table.date("due_date");
    // Whole cents, so there is never a rounding error.
    table.bigInteger("budget_minor");
    table.specificType("currency", "char(3)");
    table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("archived_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // The client must be in the same workspace as the project.
    table
      .foreign(["client_id", "workspace_id"])
      .references(["id", "workspace_id"])
      .inTable("clients")
      .onDelete("CASCADE");
    // Lets tasks and files point at (id, workspace_id) together later.
    table.unique(["id", "workspace_id"]);
    table.index(["workspace_id", "client_id"]);
    table.index(["workspace_id", "status"]);
  });

  await knex.raw(
    `ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('planned', 'active', 'on_hold', 'completed'))`,
  );
  await knex.raw(
    `ALTER TABLE projects ADD CONSTRAINT projects_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$')`,
  );
  await knex.raw(
    `ALTER TABLE projects ADD CONSTRAINT projects_budget_check CHECK (budget_minor IS NULL OR budget_minor >= 0)`,
  );
  await knex.raw(
    `ALTER TABLE projects ADD CONSTRAINT projects_dates_check CHECK (start_date IS NULL OR due_date IS NULL OR due_date >= start_date)`,
  );

  await knex.schema.createTable("project_members", (table) => {
    table.uuid("project_id").notNullable();
    table.uuid("workspace_id").notNullable();
    table.uuid("user_id").notNullable();
    table.text("role").notNullable().defaultTo("member");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(["project_id", "user_id"]);
    // The project and the person must both be in this workspace. If the person leaves the
    // workspace, their assignments go with them.
    table
      .foreign(["project_id", "workspace_id"])
      .references(["id", "workspace_id"])
      .inTable("projects")
      .onDelete("CASCADE");
    table
      .foreign(["workspace_id", "user_id"])
      .references(["workspace_id", "user_id"])
      .inTable("memberships")
      .onDelete("CASCADE");
    table.index(["user_id"]);
  });

  await knex.raw(
    `ALTER TABLE project_members ADD CONSTRAINT project_members_role_check CHECK (role IN ('lead', 'member'))`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("project_members");
  await knex.schema.dropTableIfExists("projects");
};
