import "../db/typeParsers.js";

const COLUMNS = [
  "id",
  "kind",
  "client_id",
  "project_id",
  "task_id",
  "data",
  "read_at",
  "created_at",
];

export const insertMany = async (executor, rows) => {
  if (rows.length > 0) {
    await executor("notifications").insert(rows);
  }
};

const inbox = (executor, { workspaceId, userId, unreadOnly }) => {
  const query = executor("notifications").where({ workspace_id: workspaceId, user_id: userId });

  if (unreadOnly) {
    query.whereNull("read_at");
  }

  return query;
};

export const list = async (executor, { limit, offset, ...filters }) => {
  return inbox(executor, filters)
    .orderBy([
      { column: "created_at", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset)
    .select(COLUMNS);
};

export const count = async (executor, filters) => {
  const row = await inbox(executor, filters).count("* as total").first();

  return Number(row.total);
};

// Marks the person's own unread notifications as read. With `ids`, only those. Anyone else's
// ids are simply not matched. Returns how many changed.
export const markRead = async (executor, { workspaceId, userId, ids }) => {
  const query = executor("notifications")
    .where({ workspace_id: workspaceId, user_id: userId })
    .whereNull("read_at");

  if (ids) {
    query.whereIn("id", ids);
  }

  return query.update({ read_at: executor.fn.now() });
};
