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
