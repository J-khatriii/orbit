export const up = async (knex) => {
  await knex.schema.createTable("tasks", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("project_id").notNullable();
    table.text("title").notNullable();
    table.text("description");
    table.text("status").notNullable().defaultTo("todo");
    table.text("priority").notNullable().defaultTo("medium");
    table.uuid("assignee_id");
    table.date("due_date");
    // Order within a column. Gaps of 1000 let a task slot between two others.
    table.integer("position").notNullable().defaultTo(0);
    // Whether the client portal (Phase 5) may show this task.
    table.boolean("client_visible").notNullable().defaultTo(false);
    table.timestamp("completed_at", { useTz: true });
    table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // The task's workspace must match its project's workspace.
    table
      .foreign(["project_id", "workspace_id"], "tasks_project_fk")
      .references(["id", "workspace_id"])
      .inTable("projects")
      .onDelete("CASCADE");

    // The board query: one project's tasks, by column, in order.
    table.index(["project_id", "status", "position"], "tasks_board_idx");
    // "My tasks".
    table.index(["workspace_id", "assignee_id"], "tasks_assignee_idx");
    table.index(["workspace_id", "due_date"], "tasks_due_idx");
  });

  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
     CHECK (status IN ('todo', 'in_progress', 'in_review', 'done'))`,
  );
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
     CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`,
  );
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_title_check
     CHECK (char_length(title) BETWEEN 1 AND 200)`,
  );
  // A task is done exactly when it has a completion time.
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_completed_check
     CHECK ((status = 'done') = (completed_at IS NOT NULL))`,
  );

  // The assignee must be on the project's team. If they're taken off the team (or leave
  // the workspace), only the assignee is cleared and the task stays.
  // "SET NULL (assignee_id)" needs Postgres 15 or newer. You're on 17.
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_fk
     FOREIGN KEY (project_id, assignee_id)
     REFERENCES project_members (project_id, user_id)
     ON DELETE SET NULL (assignee_id)`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("tasks");
};
