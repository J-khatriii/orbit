const ACTIVITY_COLUMNS = [
  "activity_log.id",
  "activity_log.actor_id",
  "activity_log.entity_type",
  "activity_log.entity_id",
  "activity_log.client_id",
  "activity_log.action",
  "activity_log.metadata",
  "activity_log.created_at",
];

export const create = async (executor, event) => {
  await executor("activity_log").insert(event);
};

// Newest first. Pass clientId to see only that client's history.
export const list = async (executor, { workspaceId, clientId, limit, offset }) => {
  const filtered = () => {
    const query = executor("activity_log").where("activity_log.workspace_id", workspaceId);

    if (clientId) {
      query.where("activity_log.client_id", clientId);
    }

    return query;
  };

  const countRow = await filtered().count({ count: "*" }).first();
  const rows = await filtered()
    .leftJoin("users", "users.id", "activity_log.actor_id")
    .select([...ACTIVITY_COLUMNS, "users.name as actor_name"])
    .orderBy([
      { column: "activity_log.created_at", order: "desc" },
      { column: "activity_log.id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset);

  return { rows, total: Number(countRow.count) };
};
