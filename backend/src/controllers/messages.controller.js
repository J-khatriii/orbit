import * as messageService from "../services/message.service.js";

export const listMessages = async (req, res) => {
  const result = await messageService.listMessages({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    query: req.validated.query,
  });

  res.json(result);
};

export const createMessage = async (req, res) => {
  const result = await messageService.createMessage({
    workspaceId: req.workspace.id,
    authorId: req.user.id,
    clientId: req.params.clientId,
    input: req.validated.body,
  });

  res.status(201).json(result);
};
