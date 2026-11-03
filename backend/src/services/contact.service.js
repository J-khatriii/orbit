import { db } from "../db/knex.js";
import * as contactsRepository from "../repositories/contacts.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { recordActivity } from "./activity.service.js";
import { getClient } from "./client.service.js";
import { toContact } from "./serializers.js";

const COLUMN_NAMES = {
  name: "name",
  email: "email",
  phone: "phone",
  jobTitle: "job_title",
};

const FIELD_NAMES = Object.fromEntries(
  Object.entries(COLUMN_NAMES).map(([field, column]) => {
    return [column, field];
  }),
);

// isPrimary is handled separately, so it isn't in COLUMN_NAMES and is skipped here.
const toColumns = (input) => {
  const columns = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && COLUMN_NAMES[key]) {
      columns[COLUMN_NAMES[key]] = value;
    }
  }

  return columns;
};

const changedFields = (before, columns) => {
  return Object.entries(columns)
    .filter(([column, value]) => {
      return JSON.stringify(before[column]) !== JSON.stringify(value);
    })
    .map(([column]) => {
      return FIELD_NAMES[column];
    });
};

const contactNotFound = () => {
  return new AppError(404, "CONTACT_NOT_FOUND", "Contact not found");
};

const logContactEvent = async (
  executor,
  { workspaceId, actorId, clientId, contact, action, metadata = {} },
) => {
  await recordActivity(executor, {
    workspaceId,
    actorId,
    entityType: "contact",
    entityId: contact.id,
    clientId,
    action,
    metadata: { name: contact.name, ...metadata },
  });
};

export const listContacts = async (workspaceId, clientId) => {
  // Throws 404 if the client isn't in this workspace.
  await getClient(workspaceId, clientId);

  const rows = await contactsRepository.listForClient(db, { workspaceId, clientId });

  return rows.map((row) => {
    return toContact(row);
  });
};

export const createContact = async ({ workspaceId, userId, clientId, input }) => {
  await getClient(workspaceId, clientId);

  const row = await db.transaction(async (trx) => {
    const existing = await contactsRepository.countForClient(trx, { workspaceId, clientId });
    // The first contact is always primary. After that, only when asked.
    const isPrimary = existing === 0 ? true : input.isPrimary === true;

    if (isPrimary) {
      await contactsRepository.clearPrimary(trx, { workspaceId, clientId });
    }

    const created = await contactsRepository.create(trx, {
      ...toColumns(input),
      is_primary: isPrimary,
      workspace_id: workspaceId,
      client_id: clientId,
    });

    await logContactEvent(trx, {
      workspaceId,
      actorId: userId,
      clientId,
      contact: created,
      action: "contact.created",
      metadata: { isPrimary },
    });

    return created;
  });

  return toContact(row);
};

export const updateContact = async ({ workspaceId, userId, clientId, contactId, input }) => {
  await getClient(workspaceId, clientId);

  if (!isUuid(contactId)) {
    throw contactNotFound();
  }

  const row = await db.transaction(async (trx) => {
    const before = await contactsRepository.findById(trx, {
      workspaceId,
      clientId,
      id: contactId,
    });

    if (!before) {
      throw contactNotFound();
    }
    if (input.isPrimary === false && before.is_primary) {
      throw new AppError(409, "PRIMARY_REQUIRED", "Make another contact primary instead");
    }

    const columns = toColumns(input);
    const fields = changedFields(before, columns);

    if (input.isPrimary === true && !before.is_primary) {
      await contactsRepository.clearPrimary(trx, { workspaceId, clientId });
      columns.is_primary = true;
      fields.push("isPrimary");
    }

    // Nothing to write (for example "isPrimary: false" on someone who isn't primary).
    if (Object.keys(columns).length === 0) {
      return before;
    }

    const updated = await contactsRepository.update(trx, {
      workspaceId,
      clientId,
      id: contactId,
      columns,
    });

    if (fields.length > 0) {
      await logContactEvent(trx, {
        workspaceId,
        actorId: userId,
        clientId,
        contact: updated,
        action: "contact.updated",
        metadata: { fields },
      });
    }

    return updated;
  });

  return toContact(row);
};

export const deleteContact = async ({ workspaceId, userId, clientId, contactId }) => {
  await getClient(workspaceId, clientId);

  if (!isUuid(contactId)) {
    throw contactNotFound();
  }

  await db.transaction(async (trx) => {
    const removed = await contactsRepository.remove(trx, {
      workspaceId,
      clientId,
      id: contactId,
    });

    if (!removed) {
      throw contactNotFound();
    }
    if (removed.is_primary) {
      await contactsRepository.promoteOldest(trx, { workspaceId, clientId });
    }

    await logContactEvent(trx, {
      workspaceId,
      actorId: userId,
      clientId,
      contact: removed,
      action: "contact.deleted",
    });
  });
};
