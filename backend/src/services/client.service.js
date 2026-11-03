import { db } from "../db/knex.js";
import * as clientsRepository from "../repositories/clients.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { recordActivity } from "./activity.service.js";
import { toClient } from "./serializers.js";

const COLUMN_NAMES = {
  companyName: "company_name",
  status: "status",
  billingEmail: "billing_email",
  billingAddress: "billing_address",
  taxId: "tax_id",
  currency: "currency",
  notesInternal: "notes_internal",
  tags: "tags",
};

const FIELD_NAMES = Object.fromEntries(
  Object.entries(COLUMN_NAMES).map(([field, column]) => {
    return [column, field];
  }),
);

// Turns { companyName } into { company_name }, skipping anything that wasn't sent.
const toColumns = (input) => {
  const columns = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      columns[COLUMN_NAMES[key]] = value;
    }
  }

  return columns;
};

// Which fields would this edit really change? Returns their API names.
const changedFields = (before, columns) => {
  return Object.entries(columns)
    .filter(([column, value]) => {
      return JSON.stringify(before[column]) !== JSON.stringify(value);
    })
    .map(([column]) => {
      return FIELD_NAMES[column];
    });
};

const clientNotFound = () => {
  return new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
};

const nameTaken = () => {
  return new AppError(409, "CLIENT_EXISTS", "You already have an active client with this name");
};

// The database refuses two active clients with the same name. We turn that into a clear error.
const isNameClash = (error) => {
  return error.code === "23505" && error.constraint === "clients_unique_active_name";
};

// Every event stores the client's name as it was at the time.
const logClientEvent = async (
  executor,
  { workspaceId, actorId, client, action, metadata = {} },
) => {
  await recordActivity(executor, {
    workspaceId,
    actorId,
    entityType: "client",
    entityId: client.id,
    clientId: client.id,
    action,
    metadata: { name: client.company_name, ...metadata },
  });
};

export const listClients = async (workspaceId, query) => {
  const { page, pageSize, ...rest } = query;
  const { rows, total } = await clientsRepository.list(db, {
    workspaceId,
    ...rest,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    clients: rows.map((row) => {
      return toClient(row);
    }),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
};

export const getClient = async (workspaceId, clientId) => {
  const row = isUuid(clientId)
    ? await clientsRepository.findById(db, { workspaceId, id: clientId })
    : undefined;

  if (!row) {
    throw clientNotFound();
  }

  return toClient(row);
};

export const createClient = async ({ workspaceId, userId, input }) => {
  try {
    const row = await db.transaction(async (trx) => {
      const created = await clientsRepository.create(trx, {
        ...toColumns(input),
        workspace_id: workspaceId,
        created_by: userId,
      });

      await logClientEvent(trx, {
        workspaceId,
        actorId: userId,
        client: created,
        action: "client.created",
      });

      return created;
    });

    return toClient(row);
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }
};

export const updateClient = async ({ workspaceId, userId, clientId, input }) => {
  if (!isUuid(clientId)) {
    throw clientNotFound();
  }

  try {
    const row = await db.transaction(async (trx) => {
      const before = await clientsRepository.findById(trx, { workspaceId, id: clientId });

      if (!before) {
        throw clientNotFound();
      }

      const columns = toColumns(input);
      const fields = changedFields(before, columns);
      const updated = await clientsRepository.update(trx, { workspaceId, id: clientId, columns });

      // An edit that changes nothing isn't worth a line in the history.
      if (fields.length > 0) {
        const metadata = { fields };

        if (fields.includes("status")) {
          metadata.status = { from: before.status, to: updated.status };
        }
        if (fields.includes("companyName")) {
          metadata.previousName = before.company_name;
        }

        await logClientEvent(trx, {
          workspaceId,
          actorId: userId,
          client: updated,
          action: "client.updated",
          metadata,
        });
      }

      return updated;
    });

    return toClient(row);
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }
};

export const setClientArchived = async ({ workspaceId, userId, clientId, archived }) => {
  if (!isUuid(clientId)) {
    throw clientNotFound();
  }

  try {
    const row = await db.transaction(async (trx) => {
      const before = await clientsRepository.findById(trx, { workspaceId, id: clientId });

      if (!before) {
        throw clientNotFound();
      }
      // Already in the requested state: nothing to change, nothing to record.
      if (Boolean(before.archived_at) === archived) {
        return before;
      }

      const updated = await clientsRepository.setArchived(trx, {
        workspaceId,
        id: clientId,
        archived,
      });

      await logClientEvent(trx, {
        workspaceId,
        actorId: userId,
        client: updated,
        action: archived ? "client.archived" : "client.restored",
      });

      return updated;
    });

    return toClient(row);
  } catch (error) {
    // Bringing a client back can clash with a newer client that took the name.
    throw isNameClash(error) ? nameTaken() : error;
  }
};

export const listTags = async (workspaceId) => {
  return clientsRepository.tagCounts(db, workspaceId);
};
