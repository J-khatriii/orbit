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
    onboarded: Boolean(row.onboarded_at),
    role,
  };
};

export const toMember = (row) => {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
};

export const toInvitation = (row) => {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invitedByName: row.invited_by_name ?? null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
};

export const toClient = (row) => {
  return {
    id: row.id,
    companyName: row.company_name,
    status: row.status,
    billingEmail: row.billing_email,
    billingAddress: row.billing_address,
    taxId: row.tax_id,
    currency: row.currency,
    notesInternal: row.notes_internal,
    tags: row.tags,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
