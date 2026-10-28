const WORKSPACE_COLUMNS = [
  "id",
  "name",
  "slug",
  "logo_url",
  "brand_color",
  "default_currency",
  "timezone",
];

const PREFIXED_COLUMNS = WORKSPACE_COLUMNS.map((column) => {
  return `workspaces.${column}`;
});

export const slugExists = async (executor, slug) => {
  const row = await executor("workspaces").where({ slug }).first("id");

  return Boolean(row);
};

export const create = async (executor, { name, slug, ownerId }) => {
  const [workspace] = await executor("workspaces")
    .insert({ name, slug, owner_id: ownerId })
    .returning(WORKSPACE_COLUMNS);

  return workspace;
};

// Every workspace the user can currently enter, with their role in each.
export const listForUser = async (executor, userId) => {
  return executor("memberships")
    .join("workspaces", "workspaces.id", "memberships.workspace_id")
    .where("memberships.user_id", userId)
    .andWhere("memberships.status", "active")
    .orderBy("workspaces.created_at", "asc")
    .select([...PREFIXED_COLUMNS, "memberships.role"]);
};

// The workspace plus this user's role, but only if they are an ACTIVE member.
// Anything else (not a member, suspended, wrong id) returns undefined.
export const findForMember = async (executor, { workspaceId, userId }) => {
  return executor("memberships")
    .join("workspaces", "workspaces.id", "memberships.workspace_id")
    .where({
      "memberships.workspace_id": workspaceId,
      "memberships.user_id": userId,
      "memberships.status": "active",
    })
    .first([...PREFIXED_COLUMNS, "memberships.role"]);
};

export const update = async (executor, id, changes) => {
  const [workspace] = await executor("workspaces")
    .where({ id })
    .update(changes)
    .returning(WORKSPACE_COLUMNS);

  return workspace;
};
