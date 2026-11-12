import "../db/typeParsers.js";

const SELECT = [
  "messages.id",
  "messages.body",
  "messages.internal",
  "messages.project_id",
  "messages.author_id",
  "messages.created_at",
  "users.name as author_name",
  "projects.name as project_name",
];

const withJoins = (executor) => {
  return executor("messages")
    .leftJoin("users", "users.id", "messages.author_id")
    .leftJoin("projects", "projects.id", "messages.project_id");
};

const filtered = (executor, { workspaceId, clientId, projectId }) => {
  const query = withJoins(executor).where({
    "messages.workspace_id": workspaceId,
    "messages.client_id": clientId,
  });

  if (projectId) {
    query.where("messages.project_id", projectId);
  }

  return query;
};

export const findClient = async (executor, { workspaceId, clientId }) => {
  return executor("clients").where({ workspace_id: workspaceId, id: clientId }).first(["id"]);
};

export const findProject = async (executor, { workspaceId, projectId }) => {
  return executor("projects")
    .where({ workspace_id: workspaceId, id: projectId })
    .first(["id", "client_id"]);
};

// Newest first.
export const list = async (executor, filters) => {
  return filtered(executor, filters)
    .orderBy([
      { column: "messages.created_at", order: "desc" },
      { column: "messages.id", order: "desc" },
    ])
    .limit(filters.limit)
    .offset(filters.offset)
    .select(SELECT);
};

export const count = async (executor, filters) => {
  const row = await filtered(executor, filters).count("* as total").first();

  return Number(row.total);
};

export const findById = async (executor, { workspaceId, id }) => {
  return withJoins(executor)
    .where({ "messages.workspace_id": workspaceId, "messages.id": id })
    .first(SELECT);
};

export const insert = async (executor, columns) => {
  const [row] = await executor("messages").insert(columns).returning("id");

  return row;
};
