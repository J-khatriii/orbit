import * as filesRepository from "../repositories/files.repository.js";
import * as messagesRepository from "../repositories/messages.repository.js";
import { canPreview } from "./file.service.js";
import { toAttachment, toPortalAttachment } from "./serializers.js";

// The attachments of a page of messages, as a Map of message id -> list. `forClient` gives the
// client's view: only files still shared, and only what a client may know.
export const attachmentsByMessage = async (executor, { workspaceId, messageIds, forClient }) => {
  const rows = await messagesRepository.listAttachments(executor, {
    workspaceId,
    messageIds,
    onlyVisible: forClient,
  });
  const groups = new Map();

  rows.forEach((row) => {
    const item = forClient
      ? toPortalAttachment(row, canPreview(row.content_type))
      : toAttachment(row);

    groups.set(row.message_id, [...(groups.get(row.message_id) ?? []), item]);
  });

  return groups;
};

// Saves the file rows for a message, inside the message's transaction. Returns the rows.
export const insertAttachments = async (
  trx,
  { workspaceId, clientId, userId, messageId, stored, clientVisible },
) => {
  const rows = stored.map((item) => {
    return {
      id: item.id,
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: null,
      uploaded_by: userId,
      message_id: messageId,
      name: item.name,
      content_type: item.contentType,
      size_bytes: item.size,
      storage_key: item.key,
      client_visible: clientVisible,
    };
  });

  await filesRepository.insertMany(trx, rows);

  return rows;
};
