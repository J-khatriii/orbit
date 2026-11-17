import { db } from "../db/knex.js";
import * as messagesRepository from "../repositories/messages.repository.js";
import * as portalRepository from "../repositories/portal.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { listAccessibleClientIds } from "./clientAccess.service.js";
import { notifyClientMessage } from "./notification.service.js";
import { canPreview, discardStored, removeTemps, storeUploads } from "./file.service.js";
import { attachmentsByMessage, insertAttachments } from "./messageAttachments.js";
import {
  toPortalClient,
  toPortalFile,
  toPortalInvoice,
  toPortalMessage,
  toPortalProject,
  toPortalTask,
  toPortalAttachment,
} from "./serializers.js";
import * as invoicesRepository from "../repositories/invoices.repository.js";
import * as invoiceService from "./invoice.service.js";

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
  // Only files that are still shared.
  const attachments = await attachmentsByMessage(db, {
    workspaceId,
    messageIds: rows.map((row) => {
      return row.id;
    }),
    forClient: true,
  });

  return {
    messages: rows.map((row) => {
      return toPortalMessage(row, userId, attachments.get(row.id) ?? []);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

export const createClientMessage = async ({ workspaceId, userId, clientId, input, uploads }) => {
  try {
    const client = await requireClientAccess(workspaceId, userId, clientId);
    const stored = await storeUploads(workspaceId, uploads);

    try {
      const { row, files } = await db.transaction(async (trx) => {
        const created = await messagesRepository.insert(trx, {
          workspace_id: workspaceId,
          client_id: clientId,
          project_id: null,
          author_id: userId,
          body: input.body,
          internal: false,
        });
        // What a client attaches is visible to them and to the team.
        const saved = await insertAttachments(trx, {
          workspaceId,
          clientId,
          userId,
          messageId: created.id,
          stored,
          clientVisible: true,
        });
        const message = await messagesRepository.findById(trx, { workspaceId, id: created.id });

        await notifyClientMessage(trx, {
          workspaceId,
          authorId: userId,
          authorName: message.author_name,
          client,
        });

        return { row: message, files: saved };
      });

      return {
        message: toPortalMessage(
          row,
          userId,
          files.map((file) => {
            return toPortalAttachment(file, canPreview(file.content_type));
          }),
        ),
      };
    } catch (error) {
      await discardStored(stored);
      throw error;
    }
  } finally {
    await removeTemps(uploads);
  }
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

export const listInvoices = async ({ workspaceId, userId, query }) => {
  const accessible = await listAccessibleClientIds(workspaceId, userId);
  // A client filter can only narrow what the person already has access to.
  const clientIds = query.clientId
    ? accessible.filter((id) => {
        return id === query.clientId;
      })
    : accessible;

  if (clientIds.length === 0) {
    return { invoices: [], page: query.page, pageSize: query.pageSize, total: 0 };
  }

  const filters = { workspaceId, clientIds };
  const [rows, total] = await Promise.all([
    portalRepository.listInvoices(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    portalRepository.countInvoices(db, filters),
  ]);

  return {
    invoices: rows.map((row) => {
      return toPortalInvoice(row);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

// The same answer whether the invoice doesn't exist, is a draft, or belongs to someone else.
const loadVisibleInvoice = async (workspaceId, userId, invoiceId) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const row =
    clientIds.length > 0 && isUuid(invoiceId)
      ? await portalRepository.findInvoice(db, { workspaceId, clientIds, invoiceId })
      : undefined;

  if (!row) {
    throw new AppError(404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  return row;
};

export const getInvoice = async ({ workspaceId, userId, invoiceId }) => {
  const row = await loadVisibleInvoice(workspaceId, userId, invoiceId);
  const items = await invoicesRepository.listItems(db, { workspaceId, invoiceId: row.id });

  return { invoice: toPortalInvoice(row, items) };
};

export const getInvoicePdf = async ({ workspaceId, userId, invoiceId }) => {
  const row = await loadVisibleInvoice(workspaceId, userId, invoiceId);

  return invoiceService.getInvoicePdf({ workspaceId, invoiceId: row.id });
};
