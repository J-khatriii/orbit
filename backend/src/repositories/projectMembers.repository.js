export const listForProject = async (executor, { workspaceId, projectId }) => {
  return executor("project_members")
    .join("users", "users.id", "project_members.user_id")
    .where({ "project_members.workspace_id": workspaceId, "project_members.project_id": projectId })
    .orderBy([{ column: "project_members.role" }, { column: "users.name" }, { column: "users.id" }])
    .select([
      "project_members.user_id",
      "project_members.role",
      "project_members.created_at",
      "users.name",
      "users.email",
      "users.avatar_url",
    ]);
};

export const exists = async (executor, { projectId, userId }) => {
  const row = await executor("project_members")
    .where({ project_id: projectId, user_id: userId })
    .first("user_id");

  return Boolean(row);
};

export const add = async (executor, { workspaceId, projectId, userId, role }) => {
  await executor("project_members").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    user_id: userId,
    role,
  });
};

export const remove = async (executor, { workspaceId, projectId, userId }) => {
  return executor("project_members")
    .where({ workspace_id: workspaceId, project_id: projectId, user_id: userId })
    .del();
};
