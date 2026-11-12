export const up = async (knex) => {
  // Lets a review point at a task and its workspace together, like your other tenant tables.
  await knex.raw(
    `ALTER TABLE tasks ADD CONSTRAINT tasks_id_workspace_unique UNIQUE (id, workspace_id)`,
  );

  await knex.schema.createTable("task_reviews", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("task_id").notNullable();
    table.uuid("reviewer_id").references("id").inTable("users").onDelete("SET NULL");
    table.text("decision").notNullable();
    table.text("comment");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(["task_id", "workspace_id"], "task_reviews_task_fk")
      .references(["id", "workspace_id"])
      .inTable("tasks")
      .onDelete("CASCADE");

    // A task's decisions, newest first.
    table.index(["task_id", "created_at"], "task_reviews_task_idx");
  });

  await knex.raw(
    `ALTER TABLE task_reviews ADD CONSTRAINT task_reviews_decision_check
     CHECK (decision IN ('approved', 'changes_requested'))`,
  );
  await knex.raw(
    `ALTER TABLE task_reviews ADD CONSTRAINT task_reviews_comment_check
     CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 2000)`,
  );
  // Asking for changes has to say what to change.
  await knex.raw(
    `ALTER TABLE task_reviews ADD CONSTRAINT task_reviews_changes_need_comment
     CHECK (decision = 'approved' OR comment IS NOT NULL)`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("task_reviews");
  await knex.raw(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_id_workspace_unique`);
};
