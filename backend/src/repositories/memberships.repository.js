const MEMBERSHIP_COLUMNS = ["id", "workspace_id", "user_id", "role", "status"];

export const create = async (executor, { workspaceId, userId, role }) => {
  const [membership] = await executor("memberships")
    .insert({ workspace_id: workspaceId, user_id: userId, role })
    .returning(MEMBERSHIP_COLUMNS);

  return membership;
};
