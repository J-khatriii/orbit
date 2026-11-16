import "../db/typeParsers.js";

const SELECT = [
  "files.id",
  "files.client_id",
  "files.project_id",
  "files.uploaded_by",
  "files.name",
  "files.content_type",
  "files.size_bytes",
  "files.storage_key",
  "files.client_visible",
  "files.created_at",
  "users.name as uploader_name",
  "projects.name as project_name",
];

const withJoins = (executor) => {
  return executor("files")
    .leftJoin("users", "users.id", "files.uploaded_by")
    .leftJoin("projects", "projects.id", "files.project_id");
};

const filtered = (executor, { workspaceId, clientId, projectId }) => {
  const query = withJoins(executor).where({
    "files.workspace_id": workspaceId,
    "files.client_id": clientId,
  });

  if (projectId) {
    query.where("files.project_id", projectId);
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

export const list = async (executor, { limit, offset, ...filters }) => {
  return filtered(executor, filters)
    .orderBy([
      { column: "files.created_at", order: "desc" },
      { column: "files.id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset)
    .select(SELECT);
};

export const count = async (executor, filters) => {
  const row = await filtered(executor, filters).count("* as total").first();

  return Number(row.total);
};

export const findById = async (executor, { workspaceId, clientId, id }) => {
  return withJoins(executor)
    .where({ "files.workspace_id": workspaceId, "files.client_id": clientId, "files.id": id })
    .first(SELECT);
};

export const insert = async (executor, columns) => {
  await executor("files").insert(columns);
};

export const update = async (executor, { workspaceId, id, columns }) => {
  await executor("files").where({ workspace_id: workspaceId, id }).update(columns);
};

export const remove = async (executor, { workspaceId, id }) => {
  await executor("files").where({ workspace_id: workspaceId, id }).del();
};

export const insertMany = async (executor, rows) => {
  if (rows.length > 0) {
    await executor("files").insert(rows);
  }
};
