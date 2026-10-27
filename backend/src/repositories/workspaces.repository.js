const WORKSPACE_COLUMNS = [
  "id",
  "name",
  "slug",
  "logo_url",
  "brand_color",
  "default_currency",
  "timezone",
];

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
  const columns = WORKSPACE_COLUMNS.map((column) => {
    return `workspaces.${column}`;
  });

  return executor("memberships")
    .join("workspaces", "workspaces.id", "memberships.workspace_id")
    .where("memberships.user_id", userId)
    .andWhere("memberships.status", "active")
    .orderBy("workspaces.created_at", "asc")
    .select([...columns, "memberships.role"]);
};
