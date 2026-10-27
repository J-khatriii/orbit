export const create = async (executor, { userId, tokenHash, expiresAt, userAgent, ipAddress }) => {
  const [session] = await executor("sessions")
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress,
    })
    .returning(["id", "user_id", "expires_at"]);

  return session;
};

// Returns the session joined with its user, or undefined if the token is unknown or expired
export const findActiveWithUser = async (executor, tokenHash) => {
  return executor("sessions")
    .join("users", "users.id", "sessions.user_id")
    .where("sessions.token_hash", tokenHash)
    .andWhere("sessions.expires_at", ">", executor.raw("now()"))
    .first(
      "sessions.id as session_id",
      "users.id",
      "users.email",
      "users.name",
      "users.avatar_url",
      "users.email_verified_at",
      "users.created_at",
    );
};

export const deleteByTokenHash = async (executor, tokenHash) => {
  await executor("sessions").where({ token_hash: tokenHash }).del();
};
