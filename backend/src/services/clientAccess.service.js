import { db } from "../db/knex.js";
import * as accessRepository from "../repositories/clientAccess.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { recordActivity } from "./activity.service.js";
import { toClientAccess } from "./serializers.js";

const isAccessClash = (error) => {
  return error.code === "23505" && error.constraint === "client_access_unique";
};

const loadClient = async (executor, workspaceId, clientId) => {
  const row = isUuid(clientId)
    ? await accessRepository.findClient(executor, { workspaceId, clientId })
    : undefined;

  if (!row) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }

  return row;
};

export const listAccess = async (workspaceId, clientId) => {
  const client = await loadClient(db, workspaceId, clientId);
  const rows = await accessRepository.listForClient(db, { workspaceId, clientId: client.id });

  return {
    people: rows.map((row) => {
      return toClientAccess(row);
    }),
  };
};

export const grantAccess = async ({ workspaceId, actorId, clientId, userId }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const member = isUuid(userId)
    ? await accessRepository.findMember(db, { workspaceId, userId })
    : undefined;

  // Only an active client-role member of this workspace can be given a portal.
  if (!member || member.status !== "active" || member.role !== "client") {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields", {
      fields: { userId: "Choose a client user from this workspace" },
    });
  }

  try {
    const created = await db.transaction(async (trx) => {
      const row = await accessRepository.insert(trx, {
        workspace_id: workspaceId,
        client_id: client.id,
        user_id: member.id,
        granted_by: actorId,
      });

      await recordActivity(trx, {
        workspaceId,
        actorId,
        entityType: "client",
        entityId: client.id,
        clientId: client.id,
        action: "client.access_granted",
        metadata: { name: client.company_name, userName: member.name },
      });

      return row;
    });

    return {
      person: toClientAccess({
        user_id: member.id,
        name: member.name,
        email: member.email,
        granted_at: created.created_at,
      }),
    };
  } catch (error) {
    throw isAccessClash(error)
      ? new AppError(409, "ACCESS_EXISTS", "This person already has access")
      : error;
  }
};

export const revokeAccess = async ({ workspaceId, actorId, clientId, userId }) => {
  const client = await loadClient(db, workspaceId, clientId);
  const valid = isUuid(userId);
  const member = valid ? await accessRepository.findMember(db, { workspaceId, userId }) : undefined;

  await db.transaction(async (trx) => {
    const removed = valid
      ? await accessRepository.remove(trx, { workspaceId, clientId: client.id, userId })
      : 0;

    if (removed === 0) {
      throw new AppError(404, "ACCESS_NOT_FOUND", "This person doesn't have access");
    }

    await recordActivity(trx, {
      workspaceId,
      actorId,
      entityType: "client",
      entityId: client.id,
      clientId: client.id,
      action: "client.access_revoked",
      metadata: { name: client.company_name, userName: member?.name ?? null },
    });
  });
};

// For the portal (step 5.3): the clients this person may see in this workspace.
export const listAccessibleClientIds = async (workspaceId, userId) => {
  return accessRepository.listClientIdsForUser(db, { workspaceId, userId });
};
