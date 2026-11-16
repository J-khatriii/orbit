import { db } from "../db/knex.js";
import * as messagesRepository from "../repositories/messages.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { discardStored, removeTemps, storeUploads } from "./file.service.js";
import { attachmentsByMessage, insertAttachments } from "./messageAttachments.js";
import { notifyTeamMessage } from "./notification.service.js";
import { toAttachment, toMessage } from "./serializers.js";

const loadClient = async (executor, workspaceId, clientId) => {
  const row = isUuid(clientId)
    ? await messagesRepository.findClient(executor, { workspaceId, clientId })
    : undefined;

  if (!row) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }

  return row;
};

export const listMessages = async ({ workspaceId, clientId, query }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const filters = {
    workspaceId,
    clientId: client.id,
    projectId: query.projectId,
    includeInternal: true,
  };
  const [rows, total] = await Promise.all([
    messagesRepository.list(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    messagesRepository.count(db, filters),
  ]);
  const attachments = await attachmentsByMessage(db, {
    workspaceId,
    messageIds: rows.map((row) => {
      return row.id;
    }),
    forClient: false,
  });

  return {
    messages: rows.map((row) => {
      return toMessage(row, attachments.get(row.id) ?? []);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

// `uploads` are the files that came with the message (possibly none).
export const createMessage = async ({ workspaceId, authorId, clientId, input, uploads }) => {
  try {
    const client = await loadClient(db, workspaceId, clientId);

    if (input.projectId) {
      const project = await messagesRepository.findProject(db, {
        workspaceId,
        projectId: input.projectId,
      });

      // A message can only be about one of this client's own projects.
      if (!project || project.client_id !== client.id) {
        throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields", {
          fields: { projectId: "Choose one of this client's projects" },
        });
      }
    }

    // Checked and stored before anything is written to the database.
    const stored = await storeUploads(workspaceId, uploads);

    try {
      const { row, files } = await db.transaction(async (trx) => {
        const created = await messagesRepository.insert(trx, {
          workspace_id: workspaceId,
          client_id: client.id,
          project_id: input.projectId ?? null,
          author_id: authorId,
          body: input.body,
          internal: input.internal,
        });
        // Files on an internal note stay private to the team. Otherwise they're shared.
        const saved = await insertAttachments(trx, {
          workspaceId,
          clientId: client.id,
          userId: authorId,
          messageId: created.id,
          stored,
          clientVisible: !input.internal,
        });
        const message = await messagesRepository.findById(trx, { workspaceId, id: created.id });

        // Internal notes are for the team, so the client is never told about them.
        if (!input.internal) {
          await notifyTeamMessage(trx, {
            workspaceId,
            authorId,
            authorName: message.author_name,
            client,
          });
        }

        return { row: message, files: saved };
      });

      return {
        message: toMessage(
          row,
          files.map((file) => {
            return toAttachment(file);
          }),
        ),
      };
    } catch (error) {
      // No message, so the stored bytes would be orphaned.
      await discardStored(stored);
      throw error;
    }
  } finally {
    await removeTemps(uploads);
  }
};
