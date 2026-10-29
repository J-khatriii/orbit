import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { invitationEmail } from "../emails/templates.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/mailer.js";
import * as invitationsRepository from "../repositories/invitations.repository.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { toInvitation } from "./serializers.js";
import { hashToken } from "./session.service.js";

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
