export const up = async (knex) => {
  await knex.schema.createTable("project_templates", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.specificType("name", "citext").notNullable();
    table.text("description");
    table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Lets the template's tasks point at (id, workspace_id) together.
    table.unique(["id", "workspace_id"]);
  });

  await knex.raw(
    `ALTER TABLE project_templates ADD CONSTRAINT project_templates_name_check
     CHECK (char_length(name) BETWEEN 1 AND 120)`,
  );
  // No two templates in a workspace may share a name (citext ignores case).
  await knex.raw(
    `CREATE UNIQUE INDEX project_templates_unique_name
     ON project_templates (workspace_id, name)`,
  );

  await knex.schema.createTable("project_template_tasks", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("template_id").notNullable();
    table.text("title").notNullable();
    table.text("description");
    table.text("priority").notNullable().defaultTo("medium");
    // Days after the project's start date (or after today). Empty means no due date.
    table.integer("due_offset_days");
    table.integer("position").notNullable().defaultTo(0);

    // The task's workspace must match its template's workspace.
    table
      .foreign(["template_id", "workspace_id"], "template_tasks_template_fk")
      .references(["id", "workspace_id"])
      .inTable("project_templates")
      .onDelete("CASCADE");
    table.index(["template_id", "position"], "template_tasks_order_idx");
  });

  await knex.raw(
    `ALTER TABLE project_template_tasks ADD CONSTRAINT template_tasks_title_check
     CHECK (char_length(title) BETWEEN 1 AND 200)`,
  );
  await knex.raw(
    `ALTER TABLE project_template_tasks ADD CONSTRAINT template_tasks_priority_check
     CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`,
  );
  await knex.raw(
    `ALTER TABLE project_template_tasks ADD CONSTRAINT template_tasks_offset_check
     CHECK (due_offset_days IS NULL OR due_offset_days BETWEEN 0 AND 3650)`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("project_template_tasks");
  await knex.schema.dropTableIfExists("project_templates");
};
