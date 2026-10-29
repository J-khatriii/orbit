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
