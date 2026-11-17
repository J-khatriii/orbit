export const up = async (knex) => {
  await knex.schema.alterTable("invoices", (table) => {
    table.timestamp("last_emailed_at", { useTz: true });
    table.integer("email_count").notNullable().defaultTo(0);
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable("invoices", (table) => {
    table.dropColumn("last_emailed_at");
    table.dropColumn("email_count");
  });
};
