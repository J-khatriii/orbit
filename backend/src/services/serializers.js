// Database rows use snake_case. The API speaks camelCase and never exposes password hashes.

export const toUser = (row) => {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
};

export const toWorkspace = (row, role) => {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    brandColor: row.brand_color,
    defaultCurrency: row.default_currency,
    timezone: row.timezone,
    role,
  };
};
