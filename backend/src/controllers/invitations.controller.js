import { setSessionCookie } from "../lib/sessionCookie.js";
import * as invitationService from "../services/invitation.service.js";

export const createInvitation = async (req, res) => {
  const result = await invitationService.createInvitation({
    workspace: req.workspace,
    inviter: req.user,
    inviterRole: req.membership.role,
    ...req.validated.body,
  });

  res.status(201).json(result);
};

export const listInvitations = async (req, res) => {
  const invitations = await invitationService.listPendingInvitations(req.workspace.id);

  res.json({ invitations });
};

export const revokeInvitation = async (req, res) => {
  await invitationService.revokeInvitation(req.workspace.id, req.params.invitationId);

  res.status(204).end();
};

export const previewInvitation = async (req, res) => {
  const invitation = await invitationService.previewInvitation(req.validated.body.token);

  res.json({ invitation });
};

export const acceptInvitation = async (req, res) => {
  const { session, ...result } = await invitationService.acceptInvitation({
    ...req.validated.body,
    currentUser: req.user,
    meta: { userAgent: req.get("user-agent"), ipAddress: req.ip },
  });

  // Only a brand new account gets a new session. Someone already signed in keeps theirs.
  if (session) {
    setSessionCookie(res, session.token, session.expiresAt);
  }
  res.json(result);
};
