import { db } from "../db/knex.js";
import * as clientsRepository from "../repositories/clients.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
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
    const row = await clientsRepository.create(db, {
      ...toColumns(input),
      workspace_id: workspaceId,
      created_by: userId,
    });

    return toClient(row);
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }
};

export const updateClient = async ({ workspaceId, clientId, input }) => {
  if (!isUuid(clientId)) {
    throw clientNotFound();
  }

  let row;

  try {
    row = await clientsRepository.update(db, {
      workspaceId,
      id: clientId,
      columns: toColumns(input),
    });
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }

  if (!row) {
    throw clientNotFound();
  }

  return toClient(row);
};

export const setClientArchived = async ({ workspaceId, clientId, archived }) => {
  if (!isUuid(clientId)) {
    throw clientNotFound();
  }

  let row;

  try {
    row = await clientsRepository.setArchived(db, { workspaceId, id: clientId, archived });
  } catch (error) {
    // Bringing a client back can clash with a newer client that took the name.
    throw isNameClash(error) ? nameTaken() : error;
  }

  if (!row) {
    throw clientNotFound();
  }

  return toClient(row);
};

export const listTags = async (workspaceId) => {
  return clientsRepository.tagCounts(db, workspaceId);
};
