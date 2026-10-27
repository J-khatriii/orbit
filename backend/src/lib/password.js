import argon2 from "argon2";

export const hashPassword = async (password) => {
  return argon2.hash(password);
};

export const verifyPassword = async (hash, password) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

// When a login email doesn't exist there is no real hash to check. We check against
// this one anyway so "unknown email" takes as long as "wrong password" and the response
// time doesn't reveal which emails have accounts.
const DUMMY_HASH = await argon2.hash("orbit-dummy-password");

export const verifyAgainstDummy = async (password) => {
  await verifyPassword(DUMMY_HASH, password);

  return false;
};
