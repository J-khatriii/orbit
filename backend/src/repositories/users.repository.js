const USER_COLUMNS = ["id", "email", "name", "avatar_url", "email_verified_at", "created_at"];

export const create = async (executor, { email, name, passwordHash }) => {
  const [user] = await executor("users")
    .insert({ email, name, password_hash: passwordHash })
    .returning(USER_COLUMNS);

  return user;
};

// The only place that reads password_hash. Used by login and nothing else
export const findByEmailWithPassword = async (executor, email) => {
  return executor("users")
    .where({ email })
    .first([...USER_COLUMNS, "password_hash"]);
};

export const touchLastLogin = async (executor, id) => {
  await executor("users")
    .where({ id })
    .update({ last_login_at: executor.raw("now()") });
};

export const markEmailVerified = async (executor, id) => {
  await executor("users")
    .where({ id })
    .whereNull("email_verified_at")
    .update({ email_verified_at: executor.raw("now()") });
};
