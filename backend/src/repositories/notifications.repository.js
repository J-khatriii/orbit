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

// Active client-role users who have been given access to this client.
export const listClientUserIds = async (executor, { workspaceId, clientId }) => {
  const rows = await executor("client_access")
    .join("memberships", (join) => {
      join
        .on("memberships.user_id", "client_access.user_id")
        .andOn("memberships.workspace_id", "client_access.workspace_id");
    })
    .where({
      "client_access.workspace_id": workspaceId,
      "client_access.client_id": clientId,
      "memberships.status": "active",
    })
    .select("client_access.user_id as user_id");

  return rows.map((row) => {
    return row.user_id;
  });
};

// Owners and admins, plus the people on this client's projects (or on one project).
export const listTeamUserIds = async (executor, { workspaceId, clientId, projectId = null }) => {
  const result = await executor.raw(
    `SELECT user_id FROM memberships
       WHERE workspace_id = ? AND status = 'active' AND role IN ('owner', 'admin')
     UNION
     SELECT pm.user_id FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       JOIN memberships m
         ON m.user_id = pm.user_id AND m.workspace_id = p.workspace_id AND m.status = 'active'
       WHERE p.workspace_id = ? AND p.client_id = ?
         AND (?::uuid IS NULL OR p.id = ?::uuid)`,
    [workspaceId, workspaceId, clientId, projectId, projectId],
  );

  return result.rows.map((row) => {
    return row.user_id;
  });
};

export const findUserName = async (executor, userId) => {
  const row = await executor("users").where({ id: userId }).first(["name"]);

  return row?.name ?? null;
};
