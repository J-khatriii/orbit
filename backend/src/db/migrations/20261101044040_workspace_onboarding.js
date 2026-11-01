export const up = async (knex) => {
  await knex.schema.alterTable("workspaces", (table) => {
    table.timestamp("onboarded_at", { useTz: true });
  });

  // Workspaces that exist today are already set up. Only new ones start the wizard.
  await knex("workspaces").update({ onboarded_at: knex.fn.now() });
};

export const down = async (knex) => {
  await knex.schema.alterTable("workspaces", (table) => {
    table.dropColumn("onboarded_at");
  });
};
