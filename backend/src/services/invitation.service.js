import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { invitationEmail } from "../emails/templates.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/mailer.js";
import { hashPassword } from "../lib/password.js";
import * as invitationsRepository from "../repositories/invitations.repository.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import * as usersRepository from "../repositories/users.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { getAccount } from "./auth.service.js";
import { toInvitation } from "./serializers.js";
import { createSession, hashToken } from "./session.service.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Which roles each role is allowed to hand out.
const INVITABLE_ROLES = {
  owner: ["admin", "member", "client"],
  admin: ["member", "client"],
};

export const createInvitation = async ({ workspace, inviter, inviterRole, email, role }) => {
  const allowed = INVITABLE_ROLES[inviterRole] ?? [];

  if (!allowed.includes(role)) {
    throw new AppError(403, "FORBIDDEN", "You can't invite someone with that role");
  }

  const alreadyMember = await membershipsRepository.existsForEmail(db, {
    workspaceId: workspace.id,
    email,
  });

  if (alreadyMember) {
    throw new AppError(409, "ALREADY_MEMBER", "This person is already part of the workspace");
  }

  const token = randomBytes(32).toString("base64url");
  let invitation;

  try {
    invitation = await db.transaction(async (trx) => {
      await invitationsRepository.revokePendingForEmail(trx, {
        workspaceId: workspace.id,
        email,
      });

      return invitationsRepository.create(trx, {
        workspaceId: workspace.id,
        email,
        role,
        tokenHash: hashToken(token),
        invitedBy: inviter.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });
    });
  } catch (err) {
    // Two admins inviting the same email in the same instant.
    if (err.code === "23505") {
      throw new AppError(409, "INVITE_CONFLICT", "An invitation was just created, please retry");
    }
    throw err;
  }

  // The invitation exists even if the email fails. We report that instead of hiding it,
  // so the app can tell the inviter to try again.
  let emailSent = true;

  try {
    const url = `${env.APP_URL}/accept-invite?token=${token}`;

    await sendEmail({
      to: email,
      ...invitationEmail({
        inviterName: inviter.name,
        workspaceName: workspace.name,
        role,
        url,
      }),
    });
  } catch (err) {
    emailSent = false;
    logger.error({ err }, "could not send invitation email");
  }

  return { invitation: toInvitation(invitation), emailSent };
};

export const listPendingInvitations = async (workspaceId) => {
  const rows = await invitationsRepository.listPending(db, workspaceId);

  return rows.map((row) => {
    return toInvitation(row);
  });
};

export const revokeInvitation = async (workspaceId, invitationId) => {
  const row = isUuid(invitationId)
    ? await invitationsRepository.revoke(db, { workspaceId, id: invitationId })
    : undefined;

  if (!row) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
  }
};

// One message for unknown, used, revoked and expired, so a guesser learns nothing.
const invalidInvitation = () => {
  return new AppError(400, "INVALID_TOKEN", "This invitation is invalid or has expired");
};

export const previewInvitation = async (token) => {
  const row = await invitationsRepository.findPendingByTokenHash(db, hashToken(token));

  if (!row) {
    throw invalidInvitation();
  }

  const account = await usersRepository.findByEmail(db, row.email);

  return {
    workspaceName: row.workspace_name,
    email: row.email,
    role: row.role,
    invitedByName: row.invited_by_name ?? null,
    accountExists: Boolean(account),
  };
};

export const acceptInvitation = async ({ token, name, password, currentUser, meta }) => {
  let result;

  try {
    result = await db.transaction(async (trx) => {
      // Claim the invitation first. If anything below throws, this is rolled back.
      const invitation = await invitationsRepository.consumeByTokenHash(trx, hashToken(token));

      if (!invitation) {
        throw invalidInvitation();
      }

      let userId;
      let session = null;

      if (currentUser) {
        if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
          throw new AppError(
            403,
            "EMAIL_MISMATCH",
            `This invitation was sent to ${invitation.email}. Sign in with that account to accept it.`,
          );
        }
        userId = currentUser.id;
      } else {
        const existing = await usersRepository.findByEmail(trx, invitation.email);

        if (existing) {
          throw new AppError(
            409,
            "ACCOUNT_EXISTS",
            "An account with this email already exists. Sign in to accept the invitation.",
          );
        }

        const fields = {};

        if (!name) {
          fields.name = "Please enter your name";
        }
        if (!password) {
          fields.password = "Choose a password";
        }
        if (Object.keys(fields).length > 0) {
          throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", {
            fields,
          });
        }

        const passwordHash = await hashPassword(password);
        const user = await usersRepository.create(trx, {
          email: invitation.email,
          name,
          passwordHash,
        });

        userId = user.id;
        session = await createSession(trx, user.id, meta);
      }

      await membershipsRepository.create(trx, {
        workspaceId: invitation.workspace_id,
        userId,
        role: invitation.role,
      });
      // They opened a link that was sent to this inbox, so the email counts as verified.
      await usersRepository.markEmailVerified(trx, userId);

      return { userId, session, workspaceId: invitation.workspace_id };
    });
  } catch (err) {
    if (err.code === "23505" && err.constraint?.includes("memberships")) {
      throw new AppError(409, "ALREADY_MEMBER", "You are already part of this workspace");
    }
    if (err.code === "23505" && err.constraint?.includes("email")) {
      throw new AppError(
        409,
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Sign in to accept the invitation.",
      );
    }
    throw err;
  }

  // Read the user again so emailVerified reflects what the transaction just saved.
  const user = await usersRepository.findById(db, result.userId);
  const account = await getAccount(user);

  return { ...account, workspaceId: result.workspaceId, session: result.session };
};
