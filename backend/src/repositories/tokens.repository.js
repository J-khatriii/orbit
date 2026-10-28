export const create = async (executor, { userId, type, tokenHash, expiresAt }) => {
  await executor("auth_tokens").insert({
    user_id: userId,
    type,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
};

// Marks the token used and returns its user in ONE statement. If two requests arrive
// together with the same token, only one of them gets a row back
export const consume = async (executor, { type, tokenHash }) => {
  const [row] = await executor("auth_tokens")
    .where({ type, token_hash: tokenHash })
    .whereNull("used_at")
    .andWhere("expires_at", ">", executor.raw("now()"))
    .update({ used_at: executor.raw("now()") })
    .returning(["user_id"]);

  return row;
};

// Requesting a new link invalidates older unused ones, so only the latest email works
export const deleteUnusedForUser = async (executor, userId, type) => {
  await executor("auth_tokens").where({ user_id: userId, type }).whereNull("used_at").del();
};
