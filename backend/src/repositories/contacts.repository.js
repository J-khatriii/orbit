const CONTACT_COLUMNS = [
  "id",
  "client_id",
  "name",
  "email",
  "phone",
  "job_title",
  "is_primary",
  "created_at",
  "updated_at",
];

export const listForClient = async (executor, { workspaceId, clientId }) => {
  return executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId })
    .orderBy([{ column: "is_primary", order: "desc" }, { column: "name" }, { column: "id" }])
    .select(CONTACT_COLUMNS);
};

export const findById = async (executor, { workspaceId, clientId, id }) => {
  return executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId, id })
    .first(CONTACT_COLUMNS);
};

export const countForClient = async (executor, { workspaceId, clientId }) => {
  const row = await executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId })
    .count({ count: "*" })
    .first();

  return Number(row.count);
};

export const create = async (executor, columns) => {
  const [row] = await executor("contacts").insert(columns).returning(CONTACT_COLUMNS);

  return row;
};

export const update = async (executor, { workspaceId, clientId, id, columns }) => {
  const [row] = await executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId, id })
    .update({ ...columns, updated_at: executor.fn.now() })
    .returning(CONTACT_COLUMNS);

  return row;
};

export const remove = async (executor, { workspaceId, clientId, id }) => {
  const [row] = await executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId, id })
    .del()
    .returning(CONTACT_COLUMNS);

  return row;
};

// Run this BEFORE making someone primary: the database allows only one primary per client.
export const clearPrimary = async (executor, { workspaceId, clientId }) => {
  await executor("contacts")
    .where({ workspace_id: workspaceId, client_id: clientId, is_primary: true })
    .update({ is_primary: false });
};

// After the primary contact is removed, the person who was added first takes over.
export const promoteOldest = async (executor, { workspaceId, clientId }) => {
  const oldest = executor("contacts")
    .select("id")
    .where({ workspace_id: workspaceId, client_id: clientId })
    .orderBy([{ column: "created_at" }, { column: "id" }])
    .limit(1);

  await executor("contacts").whereIn("id", oldest).update({ is_primary: true });
};
