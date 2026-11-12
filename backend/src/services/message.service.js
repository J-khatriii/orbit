import { db } from "../db/knex.js";
import * as messagesRepository from "../repositories/messages.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { toMessage } from "./serializers.js";

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

  return {
    messages: rows.map((row) => {
      return toMessage(row);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

export const createMessage = async ({ workspaceId, authorId, clientId, input }) => {
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

  const created = await messagesRepository.insert(db, {
    workspace_id: workspaceId,
    client_id: client.id,
    project_id: input.projectId ?? null,
    author_id: authorId,
    body: input.body,
    internal: input.internal,
  });
  const row = await messagesRepository.findById(db, { workspaceId, id: created.id });

  return { message: toMessage(row) };
};
