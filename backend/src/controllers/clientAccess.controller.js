import * as accessService from "../services/clientAccess.service.js";

export const listAccess = async (req, res) => {
  const result = await accessService.listAccess(req.workspace.id, req.params.clientId);

  res.json(result);
};

export const listCandidates = async (req, res) => {
  const result = await accessService.listCandidates(req.workspace.id, req.params.clientId);

  res.json(result);
};

export const grantAccess = async (req, res) => {
  const result = await accessService.grantAccess({
    workspaceId: req.workspace.id,
    actorId: req.user.id,
    clientId: req.params.clientId,
    userId: req.validated.body.userId,
  });

  res.status(201).json(result);
};

export const revokeAccess = async (req, res) => {
  await accessService.revokeAccess({
    workspaceId: req.workspace.id,
    actorId: req.user.id,
    clientId: req.params.clientId,
    userId: req.params.userId,
  });

  res.status(204).end();
};
