const addTimestamps = (knex, table) => {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
};

const addUpdatedAtTrigger = (knex, tableName) => {
  return knex.raw(
    `CREATE TRIGGER ${tableName}_set_updated_at
     BEFORE UPDATE ON ${tableName}
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  );
};

export const up = async (knex) => {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.specificType("email", "citext").notNullable().unique();
    table.text("password_hash").notNullable();
    table.text("name").notNullable();
    table.text("avatar_url");
    table.timestamp("email_verified_at", { useTz: true });
    table.timestamp("last_login_at", { useTz: true });
    addTimestamps(knex, table);
  });
  await addUpdatedAtTrigger(knex, "users");

  await knex.schema.createTable("workspaces", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("name").notNullable();
    table.text("slug").notNullable().unique();
    table.text("logo_url");
    table.text("brand_color").notNullable().defaultTo("#2b4bd3");
    table.uuid("owner_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.string("default_currency", 3).notNullable().defaultTo("USD");
    table.text("timezone").notNullable().defaultTo("UTC");
    table.text("custom_domain").unique();
    addTimestamps(knex, table);
    table.index(["owner_id"]);
  });
  await knex.raw(
    `ALTER TABLE workspaces
     ADD CONSTRAINT workspaces_slug_format
     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
  );
  await addUpdatedAtTrigger(knex, "workspaces");

  await knex.schema.createTable("memberships", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("workspace_id")
      .notNullable()
      .references("id")
      .inTable("workspaces")
      .onDelete("CASCADE");
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("role").notNullable();
    table.text("status").notNullable().defaultTo("active");
    addTimestamps(knex, table);
    table.unique(["workspace_id", "user_id"]);
    table.index(["user_id"]);
  });
  await knex.raw(
    `ALTER TABLE memberships
     ADD CONSTRAINT memberships_role_check
     CHECK (role IN ('owner', 'admin', 'member', 'client'))`,
  );
  await knex.raw(
    `ALTER TABLE memberships
     ADD CONSTRAINT memberships_status_check
     CHECK (status IN ('active', 'suspended'))`,
  );
  await addUpdatedAtTrigger(knex, "memberships");
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("memberships");
  await knex.schema.dropTableIfExists("workspaces");
  await knex.schema.dropTableIfExists("users");
};
