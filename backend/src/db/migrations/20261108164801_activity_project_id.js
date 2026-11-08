export const up = async (knex) => {
  await knex.schema.alterTable("activity_log", (table) => {
    table.uuid("project_id");
    // The project must be in the same workspace as the event.
    table
      .foreign(["project_id", "workspace_id"], "activity_project_fk")
      .references(["id", "workspace_id"])
      .inTable("projects")
      .onDelete("CASCADE");
    table.index(["project_id", "created_at"], "activity_project_idx");
  });

  // Project events recorded so far belong to the project they're about.
  await knex.raw(`UPDATE activity_log SET project_id = entity_id WHERE entity_type = 'project'`);
};

export const down = async (knex) => {
  await knex.schema.alterTable("activity_log", (table) => {
    table.dropIndex(["project_id", "created_at"], "activity_project_idx");
    table.dropForeign(["project_id", "workspace_id"], "activity_project_fk");
    table.dropColumn("project_id");
  });
};
