const MEMBERSHIP_COLUMNS = ["id", "workspace_id", "user_id", "role", "status"];

export const create = async (executor, { workspaceId, userId, role }) => {
  const [membership] = await executor("memberships")
    .insert({ workspace_id: workspaceId, user_id: userId, role })
    .returning(MEMBERSHIP_COLUMNS);

  return membership;
};

export const listForWorkspace = async (executor, workspaceId) => {
  return executor("memberships")
    .join("users", "users.id", "memberships.user_id")
    .where("memberships.workspace_id", workspaceId)
    .orderBy("memberships.created_at", "asc")
    .select(
      "users.id as user_id",
      "users.name",
      "users.email",
      "users.avatar_url",
      "memberships.role",
      "memberships.status",
      "memberships.created_at as joined_at",
    );
};
