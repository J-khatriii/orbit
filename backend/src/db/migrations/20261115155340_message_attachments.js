// Files can belong to a message. The composite foreign key keeps a file and its message
// in the same workspace. Deleting a message never deletes the file, only the link.
export const up = async (knex) => {
  await knex.raw(
    "ALTER TABLE messages ADD CONSTRAINT messages_id_workspace_unique UNIQUE (id, workspace_id)",
  );
  await knex.raw("ALTER TABLE files ADD COLUMN message_id uuid");
  await knex.raw(`
    ALTER TABLE files
    ADD CONSTRAINT files_message_fk
    FOREIGN KEY (message_id, workspace_id) REFERENCES messages (id, workspace_id)
    ON DELETE SET NULL (message_id)
  `);
  await knex.raw(
    "CREATE INDEX files_message_idx ON files (message_id) WHERE message_id IS NOT NULL",
  );
};

export const down = async (knex) => {
  await knex.raw("DROP INDEX files_message_idx");
  await knex.raw("ALTER TABLE files DROP CONSTRAINT files_message_fk");
  await knex.raw("ALTER TABLE files DROP COLUMN message_id");
  await knex.raw("ALTER TABLE messages DROP CONSTRAINT messages_id_workspace_unique");
};
