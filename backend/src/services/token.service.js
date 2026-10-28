import { randomBytes } from "node:crypto";
import * as tokensRepository from "../repositories/tokens.repository.js";
import { hashToken } from "./session.service.js";

const HOUR_MS = 60 * 60 * 1000;

export const TOKEN_TYPES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
};

const TOKEN_TTL_MS = {
  [TOKEN_TYPES.EMAIL_VERIFICATION]: 24 * HOUR_MS,
  [TOKEN_TYPES.PASSWORD_RESET]: HOUR_MS,
};

// Returns the raw token (for the email link). Only its hash is stored.
export const issueToken = async (executor, userId, type) => {
  const token = randomBytes(32).toString("base64url");

  await tokensRepository.deleteUnusedForUser(executor, userId, type);
  await tokensRepository.create(executor, {
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
  });

  return token;
};

// Returns the user id if the token is valid, unused and not expired. Otherwise null.
export const consumeToken = async (executor, type, token) => {
  const row = await tokensRepository.consume(executor, { type, tokenHash: hashToken(token) });

  return row ? row.user_id : null;
};
