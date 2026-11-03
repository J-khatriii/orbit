import * as clientService from "../services/client.service.js";
import * as activityService from "../services/activity.service.js";

// req.workspace comes from workspaceContext, req.user from requireAuth.
export const listClients = async (req, res) => {
  const result = await clientService.listClients(req.workspace.id, req.validated.query);

  res.json(result);
};

export const listTags = async (req, res) => {
  const tags = await clientService.listTags(req.workspace.id);

  res.json({ tags });
};

export const getClient = async (req, res) => {
  const client = await clientService.getClient(req.workspace.id, req.params.clientId);

  res.json({ client });
};

export const createClient = async (req, res) => {
  const client = await clientService.createClient({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    input: req.validated.body,
  });

  res.status(201).json({ client });
};

export const updateClient = async (req, res) => {
  const client = await clientService.updateClient({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    input: req.validated.body,
  });

  res.json({ client });
};

export const archiveClient = async (req, res) => {
  const client = await clientService.setClientArchived({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    archived: true,
  });

  res.json({ client });
};

export const restoreClient = async (req, res) => {
  const client = await clientService.setClientArchived({
    workspaceId: req.workspace.id,
    clientId: req.params.clientId,
    archived: false,
  });

  res.json({ client });
};

export const listClientActivity = async (req, res) => {
  const result = await activityService.listClientActivity(
    req.workspace.id,
    req.params.clientId,
    req.validated.query,
  );

  res.json(result);
};
