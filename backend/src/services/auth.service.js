import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { resetPasswordEmail, verifyEmailEmail } from "../emails/templates.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/mailer.js";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "../lib/password.js";
import { AppError } from "../utils/AppError.js";
import * as usersRepository from "../repositories/users.repository.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import { generateUniqueSlug } from "./workspace.service.js";
import { createSession, destroyAllSessionsForUser } from "./session.service.js";
import { consumeToken, issueToken, TOKEN_TYPES } from "./token.service.js";
import { toUser, toWorkspace } from "./serializers.js";

// `user` only needs id, email and name, so it works for both a signup result and a session row
const sendVerificationEmail = async (user) => {
  const token = await issueToken(db, user.id, TOKEN_TYPES.EMAIL_VERIFICATION);
  const url = `${env.APP_URL}/verify-email?token=${token}`;

  await sendEmail({ to: user.email, ...verifyEmailEmail({ name: user.name, url }) });
};

export const signup = async ({ name, email, password, workspaceName }, meta) => {
  // Hash before opening the transaction: it is slow on purpose, and we want the
  // transaction to stay short
  const passwordHash = await hashPassword(password);
  let result;

  try {
    result = await db.transaction(async (trx) => {
      const user = await usersRepository.create(trx, { email, name, passwordHash });
      const slug = await generateUniqueSlug(trx, workspaceName);
      const workspace = await workspacesRepository.create(trx, {
        name: workspaceName,
        slug,
        ownerId: user.id,
      });
      const membership = await membershipsRepository.create(trx, {
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });
      const session = await createSession(trx, user.id, meta);

      return {
        user: toUser(user),
        workspaces: [toWorkspace(workspace, membership.role)],
        session,
      };
    });
  } catch (err) {
    // 23505 = Postgres unique_violation. Knex names these constraints
    // "<table>_<column>_unique", so we match on the column name
    if (err.code === "23505" && err.constraint?.includes("email")) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    if (err.code === "23505" && err.constraint?.includes("slug")) {
      throw new AppError(409, "SLUG_TAKEN", "That workspace address was just taken, please retry");
    }
    throw err;
  }

  // The account exists now. A broken mail server must not undo it: the user can resend later
  try {
    await sendVerificationEmail(result.user);
  } catch (err) {
    logger.error({ err }, "could not send verification email after signup");
  }

  return result;
};

// The user plus every workspace they belong to. Used by login and GET /me
export const getAccount = async (userRow) => {
  const rows = await workspacesRepository.listForUser(db, userRow.id);

  return {
    user: toUser(userRow),
    workspaces: rows.map((row) => {
      return toWorkspace(row, row.role);
    }),
  };
};

export const login = async ({ email, password }, meta) => {
  const user = await usersRepository.findByEmailWithPassword(db, email);

  const passwordOk = user
    ? await verifyPassword(user.password_hash, password)
    : await verifyAgainstDummy(password);

  // One message for both "no such email" and "wrong password", so the response
  // doesn't reveal which emails have accounts
  if (!passwordOk) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }

  const session = await createSession(db, user.id, meta);
  await usersRepository.touchLastLogin(db, user.id);
  const account = await getAccount(user);

  return { ...account, session };
};

export const verifyEmail = async (token) => {
  await db.transaction(async (trx) => {
    const userId = await consumeToken(trx, TOKEN_TYPES.EMAIL_VERIFICATION, token);

    if (!userId) {
      throw new AppError(400, "INVALID_TOKEN", "This link is invalid or has expired");
    }
    await usersRepository.markEmailVerified(trx, userId);
  });
};

export const resendVerification = async (userRow) => {
  if (userRow.email_verified_at) {
    throw new AppError(409, "ALREADY_VERIFIED", "Your email is already confirmed");
  }
  await sendVerificationEmail(userRow);
};

const sendPasswordResetEmail = async (user) => {
  const token = await issueToken(db, user.id, TOKEN_TYPES.PASSWORD_RESET);
  const url = `${env.APP_URL}/reset-password?token=${token}`;

  await sendEmail({ to: user.email, ...resetPasswordEmail({ name: user.name, url }) });
};

export const requestPasswordReset = async ({ email }) => {
  const user = await usersRepository.findByEmail(db, email);

  if (!user) {
    return;
  }

  // Deliberately not awaited. If we waited, an existing account would take longer to
  // answer than an unknown one, and the response time would reveal which emails exist
  sendPasswordResetEmail(user).catch((err) => {
    logger.error({ err }, "could not send password reset email");
  });
};

export const resetPassword = async ({ token, password }) => {
  await db.transaction(async (trx) => {
    const userId = await consumeToken(trx, TOKEN_TYPES.PASSWORD_RESET, token);

    if (!userId) {
      throw new AppError(400, "INVALID_TOKEN", "This link is invalid or has expired");
    }

    const passwordHash = await hashPassword(password);

    await usersRepository.updatePassword(trx, userId, passwordHash);
    // They just proved they own this inbox, so the email counts as verified
    await usersRepository.markEmailVerified(trx, userId);
    // Anyone who had the old password (or a stolen session) is signed out everywhere
    await destroyAllSessionsForUser(trx, userId);
  });
};
