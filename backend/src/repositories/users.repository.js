const USER_COLUMNS = ["id", "email", "name", "avatar_url", "email_verified_at", "created_at"];

export const create = async (executor, { email, name, passwordHash }) => {
  const [user] = await executor("users")
    .insert({ email, name, password_hash: passwordHash })
    .returning(USER_COLUMNS);

  return user;
};
