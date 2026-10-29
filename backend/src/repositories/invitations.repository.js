const INVITATION_COLUMNS = [
  "id",
  "workspace_id",
  "email",
  "role",
  "invited_by",
  "expires_at",
  "created_at",
];

// Inviting the same email again replaces the old invitation. We keep the old row, marked
// revoked, so there is a history
export const revokePendingForEmail = async (executor, { workspaceId, email }) => {
  await executor("invitations")
    .where({ workspace_id: workspaceId, email })
    .whereNull("accepted_at")
    .whereNull("revoked_at")
    .update({ revoked_at: executor.raw("now()") });
};

export const create = async (
  executor,
  { workspaceId, email, role, tokenHash, invitedBy, expiresAt },
) => {
  const [invitation] = await executor("invitations")
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: invitedBy,
      expires_at: expiresAt,
    })
    .returning(INVITATION_COLUMNS);

  return invitation;
};

// Open invitations only: not accepted, not revoked, not expired.
export const listPending = async (executor, workspaceId) => {
  return executor("invitations")
    .leftJoin("users", "users.id", "invitations.invited_by")
    .where("invitations.workspace_id", workspaceId)
    .whereNull("invitations.accepted_at")
    .whereNull("invitations.revoked_at")
    .andWhere("invitations.expires_at", ">", executor.raw("now()"))
    .orderBy("invitations.created_at", "desc")
    .select(
      "invitations.id",
      "invitations.email",
      "invitations.role",
      "invitations.expires_at",
      "invitations.created_at",
      "users.name as invited_by_name",
    );
};

// Scoped by workspace_id, so you can only ever revoke your own workspace's invitations.
export const revoke = async (executor, { workspaceId, id }) => {
  const [row] = await executor("invitations")
    .where({ id, workspace_id: workspaceId })
    .whereNull("accepted_at")
    .whereNull("revoked_at")
    .update({ revoked_at: executor.raw("now()") })
    .returning(["id"]);

  return row;
};

// Read-only lookup for the preview page. Returns undefined if the token is unknown,
// used, revoked or expired.
export const findPendingByTokenHash = async (executor, tokenHash) => {
  return executor("invitations")
    .join("workspaces", "workspaces.id", "invitations.workspace_id")
    .leftJoin("users", "users.id", "invitations.invited_by")
    .where("invitations.token_hash", tokenHash)
    .whereNull("invitations.accepted_at")
    .whereNull("invitations.revoked_at")
    .andWhere("invitations.expires_at", ">", executor.raw("now()"))
    .first(
      "invitations.id",
      "invitations.email",
      "invitations.role",
      "workspaces.name as workspace_name",
      "users.name as invited_by_name",
    );
};

// Marks the invitation accepted and returns it in ONE statement, so two simultaneous
// requests can't both accept it. If the surrounding transaction later fails, this
// is rolled back and the invitation stays usable.
export const consumeByTokenHash = async (executor, tokenHash) => {
  const [row] = await executor("invitations")
    .where({ token_hash: tokenHash })
    .whereNull("accepted_at")
    .whereNull("revoked_at")
    .andWhere("expires_at", ">", executor.raw("now()"))
    .update({ accepted_at: executor.raw("now()") })
    .returning(["id", "workspace_id", "email", "role"]);

  return row;
};
