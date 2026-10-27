import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import * as sessionsRepository from "../repositories/sessions.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// SHA-256 is enough here: the token is 256 bits of randomness, so there is nothing to brute-force
// (Passwords are different: they are guessable, which is why they use argon2)
export const hashToken = (token) => {
  return createHash("sha256").update(token).digest("hex");
};

export const createSession = async (executor, userId, { userAgent, ipAddress } = {}) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS);

  await sessionsRepository.create(executor, {
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: userAgent?.slice(0, 255),
    ipAddress,
  });

  return { token, expiresAt };
};

export const findSession = async (token) => {
  return sessionsRepository.findActiveWithUser(db, hashToken(token));
};

export const destroySession = async (token) => {
  await sessionsRepository.deleteByTokenHash(db, hashToken(token));
};
