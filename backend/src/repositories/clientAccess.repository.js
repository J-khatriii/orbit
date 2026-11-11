import "../db/typeParsers.js";

export const findClient = async (executor, { workspaceId, clientId }) => {
  return executor("clients")
    .where({ workspace_id: workspaceId, id: clientId })
    .first(["id", "company_name"]);
};

export const findMember = async (executor, { workspaceId, userId }) => {
  return executor("memberships")
    .join("users", "users.id", "memberships.user_id")
    .where({
      "memberships.workspace_id": workspaceId,
      "memberships.user_id": userId,
    })
    .first([
      "users.id as id",
      "users.name as name",
      "users.email as email",
      "memberships.role as role",
      "memberships.status as status",
    ]);
};

export const listForClient = async (executor, { workspaceId, clientId }) => {
  return executor("client_access")
    .join("users", "users.id", "client_access.user_id")
    .where({ "client_access.workspace_id": workspaceId, "client_access.client_id": clientId })
    .orderBy([{ column: "users.name" }, { column: "users.id" }])
    .select([
      "users.id as user_id",
      "users.name as name",
      "users.email as email",
      "client_access.created_at as granted_at",
    ]);
};

export const insert = async (executor, columns) => {
  const [row] = await executor("client_access").insert(columns).returning(["id", "created_at"]);

  return row;
};

// Returns how many rows were removed (0 or 1).
export const remove = async (executor, { workspaceId, clientId, userId }) => {
  return executor("client_access")
    .where({ workspace_id: workspaceId, client_id: clientId, user_id: userId })
    .del();
};

export const listClientIdsForUser = async (executor, { workspaceId, userId }) => {
  const rows = await executor("client_access")
    .where({ workspace_id: workspaceId, user_id: userId })
    .select("client_id");

  return rows.map((row) => {
    return row.client_id;
  });
};
