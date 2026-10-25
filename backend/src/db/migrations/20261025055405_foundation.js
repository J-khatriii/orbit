export async function up(knex) {
  // Case-insensitive text type. Used for emails
  // "Ana@x.com" and "ana@x.com" are the same user
  await knex.raw("CREATE EXTENSION IF NOT EXISTS citext");

  // One shared function that keeps updated_at correct
  // Every table we create later attaches a trigger that calls it
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex) {
  await knex.raw("DROP FUNCTION IF EXISTS set_updated_at()");
  await knex.raw("DROP EXTENSION IF EXISTS citext");
}
