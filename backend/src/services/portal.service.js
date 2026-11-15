import { db } from "../db/knex.js";
import * as messagesRepository from "../repositories/messages.repository.js";
import * as portalRepository from "../repositories/portal.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { listAccessibleClientIds } from "./clientAccess.service.js";
import { notifyClientMessage } from "./notification.service.js";
import { canPreview } from "./file.service.js";
import {
  toPortalClient,
  toPortalFile,
  toPortalMessage,
  toPortalProject,
  toPortalTask,
} from "./serializers.js";

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

  return client;
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
  const client = await requireClientAccess(workspaceId, userId, clientId);

  const row = await db.transaction(async (trx) => {
    const created = await messagesRepository.insert(trx, {
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: null,
      author_id: userId,
      body: input.body,
      internal: false,
    });
    const saved = await messagesRepository.findById(trx, { workspaceId, id: created.id });

    await notifyClientMessage(trx, {
      workspaceId,
      authorId: userId,
      authorName: saved.author_name,
      client,
    });

    return saved;
  });

  return { message: toPortalMessage(row, userId) };
};

export const listFiles = async ({ workspaceId, userId, query }) => {
  const accessible = await listAccessibleClientIds(workspaceId, userId);
  // A client filter can only narrow what the person already has access to.
  const clientIds = query.clientId
    ? accessible.filter((id) => {
        return id === query.clientId;
      })
    : accessible;

  if (clientIds.length === 0) {
    return { files: [], page: query.page, pageSize: query.pageSize, total: 0 };
  }

  const filters = { workspaceId, clientIds };
  const [rows, total] = await Promise.all([
    portalRepository.listFiles(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    portalRepository.countFiles(db, filters),
  ]);

  return {
    files: rows.map((row) => {
      return toPortalFile(row, canPreview(row.content_type));
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

// The database row, including where the bytes are. For the download route only.
export const getFile = async ({ workspaceId, userId, fileId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const row =
    clientIds.length > 0 && isUuid(fileId)
      ? await portalRepository.findFile(db, { workspaceId, clientIds, fileId })
      : undefined;

  // The same answer whether the file doesn't exist, isn't shared, or belongs to someone else.
  if (!row) {
    throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  }

  return row;
};
