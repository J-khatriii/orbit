import { db } from "../db/knex.js";
import * as portalRepository from "../repositories/portal.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { listAccessibleClientIds } from "./clientAccess.service.js";
import { toPortalClient, toPortalMessage, toPortalProject, toPortalTask } from "./serializers.js";
import * as messagesRepository from "../repositories/messages.repository.js";

export const listProjects = async ({ workspaceId, userId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);

  if (clientIds.length === 0) {
    return { projects: [] };
  }

  const rows = await portalRepository.listProjects(db, { workspaceId, clientIds });

  return {
    projects: rows.map((row) => {
      return toPortalProject(row);
    }),
  };
};

export const getProject = async ({ workspaceId, userId, projectId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const row =
    clientIds.length > 0 && isUuid(projectId)
      ? await portalRepository.findProject(db, { workspaceId, clientIds, projectId })
      : undefined;

  // The same answer whether the project doesn't exist or belongs to someone else.
  if (!row) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const tasks = await portalRepository.listTasks(db, { workspaceId, projectId: row.id });

  return {
    project: toPortalProject(row),
    tasks: tasks.map((task) => {
      return toPortalTask(task);
    }),
  };
};

// The person must have access to this client, and the client must not be archived.
// Anything else looks like "no such client", so nothing is revealed.
const requireClientAccess = async (workspaceId, userId, clientId) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const allowed = isUuid(clientId) && clientIds.includes(clientId);
  const client = allowed
    ? await portalRepository.findClient(db, { workspaceId, clientId })
    : undefined;

  if (!client) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }
};

export const listClients = async ({ workspaceId, userId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);

  if (clientIds.length === 0) {
    return { clients: [] };
  }

  const rows = await portalRepository.listClients(db, { workspaceId, clientIds });

  return {
    clients: rows.map((row) => {
      return toPortalClient(row);
    }),
  };
};

export const listClientMessages = async ({ workspaceId, userId, clientId, query }) => {
  await requireClientAccess(workspaceId, userId, clientId);

  // No includeInternal: clients never see internal notes.
  const filters = { workspaceId, clientId, projectId: query.projectId };
  const [rows, total] = await Promise.all([
    messagesRepository.list(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    messagesRepository.count(db, filters),
  ]);

  return {
    messages: rows.map((row) => {
      return toPortalMessage(row, userId);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

export const createClientMessage = async ({ workspaceId, userId, clientId, input }) => {
  await requireClientAccess(workspaceId, userId, clientId);

  const created = await messagesRepository.insert(db, {
    workspace_id: workspaceId,
    client_id: clientId,
    project_id: null,
    author_id: userId,
    body: input.body,
    internal: false,
  });
  const row = await messagesRepository.findById(db, { workspaceId, id: created.id });

  return { message: toPortalMessage(row, userId) };
};
