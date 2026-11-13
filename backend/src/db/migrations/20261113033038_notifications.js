export const up = async (knex) => {
  await knex.schema.createTable("notifications", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    // Who this is for.
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("kind").notNullable();
    // Who caused it.
    table.uuid("actor_id").references("id").inTable("users").onDelete("SET NULL");
    // What it's about. No foreign keys: a notification outliving its task is harmless.
    table.uuid("client_id");
    table.uuid("project_id");
    table.uuid("task_id");
    // Names at the time, for the sentence. Never message text.
    table.jsonb("data").notNullable().defaultTo("{}");
    table.timestamp("read_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // One person's notifications, newest first.
    table.index(["workspace_id", "user_id", "created_at"], "notifications_inbox_idx");
  });

  await knex.raw(
    `ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
     CHECK (kind IN ('message', 'review_requested', 'review_decided'))`,
  );
  // The unread badge counts these on every page load, so they get their own small index.
  await knex.raw(
    `CREATE INDEX notifications_unread_idx ON notifications (workspace_id, user_id)
     WHERE read_at IS NULL`,
  );
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("notifications");
};
