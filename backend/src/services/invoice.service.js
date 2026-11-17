import { db } from "../db/knex.js";
import { calculateTotals } from "../lib/money.js";
import * as invoicesRepository from "../repositories/invoices.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { toInvoice } from "./serializers.js";
import { renderInvoicePdf } from "../lib/invoicePdf.js";
import { logger } from "../lib/logger.js";
import { deliverInvoice } from "./invoiceEmail.service.js";

const invalid = (fields) => {
  return new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields", { fields });
};

// All the arithmetic happens here, never in the browser. A number too big to add safely
// is a validation error, not a crash.
const totalsFor = (items, taxRateBps) => {
  try {
    return calculateTotals(items, taxRateBps);
  } catch (error) {
    if (error instanceof RangeError) {
      throw invalid({ items: "An amount is too large" });
    }

    throw error;
  }
};

const ensureClient = async (executor, workspaceId, clientId) => {
  const client = await invoicesRepository.findClient(executor, { workspaceId, clientId });

  if (!client) {
    throw invalid({ clientId: "Choose one of your clients" });
  }
};

const ensureProject = async (executor, workspaceId, clientId, projectId) => {
  const project = await invoicesRepository.findProject(executor, { workspaceId, projectId });

  if (!project || project.client_id !== clientId) {
    throw invalid({ projectId: "Choose one of this client's projects" });
  }
};

const notFound = () => {
  return new AppError(404, "INVOICE_NOT_FOUND", "Invoice not found");
};

const loadInvoice = async (executor, workspaceId, invoiceId) => {
  const row = isUuid(invoiceId)
    ? await invoicesRepository.findById(executor, { workspaceId, id: invoiceId })
    : undefined;

  if (!row) {
    throw notFound();
  }

  return row;
};

// Locks the invoice for the rest of the transaction and returns its id and status.
const lockInvoice = async (trx, workspaceId, invoiceId) => {
  const locked = isUuid(invoiceId)
    ? await invoicesRepository.lock(trx, { workspaceId, id: invoiceId })
    : undefined;

  if (!locked) {
    throw notFound();
  }

  return locked;
};

const requireStatus = (locked, status, code, message) => {
  if (locked.status !== status) {
    throw new AppError(409, code, message);
  }
};

const itemRows = (workspaceId, invoiceId, items, lineTotals) => {
  return items.map((item, index) => {
    return {
      workspace_id: workspaceId,
      invoice_id: invoiceId,
      position: index + 1,
      description: item.description,
      quantity_milli: item.quantityMilli,
      unit_price_minor: item.unitPriceMinor,
      line_total_minor: lineTotals[index],
    };
  });
};

const EMAIL_COOLDOWN_MS = 60 * 1000;

// The team's view of an invoice: the shared fields plus when it was last emailed.
const present = (row, items) => {
  return {
    ...toInvoice(row, items),
    lastEmailedAt: row.last_emailed_at,
    emailCount: row.email_count,
  };
};

export const listInvoices = async ({ workspaceId, query }) => {
  const filters = { workspaceId, clientId: query.clientId, status: query.status };
  const [rows, total] = await Promise.all([
    invoicesRepository.list(db, {
      ...filters,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    invoicesRepository.count(db, filters),
  ]);

  return {
    invoices: rows.map((row) => {
      return present(row);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
};

export const getInvoice = async ({ workspaceId, invoiceId }) => {
  const row = await loadInvoice(db, workspaceId, invoiceId);
  const items = await invoicesRepository.listItems(db, { workspaceId, invoiceId: row.id });

  return { invoice: present(row, items) };
};

export const createInvoice = async ({ workspaceId, userId, input }) => {
  await ensureClient(db, workspaceId, input.clientId);

  if (input.projectId) {
    await ensureProject(db, workspaceId, input.clientId, input.projectId);
  }

  const totals = totalsFor(input.items, input.taxRateBps);

  const created = await db.transaction(async (trx) => {
    const row = await invoicesRepository.insert(trx, {
      workspace_id: workspaceId,
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      currency: input.currency,
      issue_date: input.issueDate,
      due_date: input.dueDate,
      tax_rate_bps: input.taxRateBps,
      subtotal_minor: totals.subtotal,
      tax_minor: totals.taxAmount,
      total_minor: totals.total,
      notes: input.notes ?? null,
      created_by: userId,
    });

    await invoicesRepository.insertItems(
      trx,
      itemRows(workspaceId, row.id, input.items, totals.lineTotals),
    );

    return row;
  });

  return getInvoice({ workspaceId, invoiceId: created.id });
};

export const updateInvoice = async ({ workspaceId, invoiceId, input }) => {
  const id = await db.transaction(async (trx) => {
    const locked = await lockInvoice(trx, workspaceId, invoiceId);

    requireStatus(locked, "draft", "INVOICE_NOT_EDITABLE", "Only drafts can be edited");

    const current = await loadInvoice(trx, workspaceId, locked.id);
    const clientId = input.clientId ?? current.client_id;
    const clientChanged = clientId !== current.client_id;
    const issueDate = input.issueDate ?? current.issue_date;
    const dueDate = input.dueDate ?? current.due_date;
    const taxRateBps = input.taxRateBps ?? current.tax_rate_bps;

    // A project belongs to one client, so changing the client clears the project unless a
    // new one is given.
    let projectId = current.project_id;

    if (input.projectId !== undefined) {
      projectId = input.projectId;
    } else if (clientChanged) {
      projectId = null;
    }

    if (dueDate < issueDate) {
      throw invalid({ dueDate: "The due date can't be before the issue date" });
    }
    if (clientChanged) {
      await ensureClient(trx, workspaceId, clientId);
    }
    if (projectId) {
      await ensureProject(trx, workspaceId, clientId, projectId);
    }

    // Without new lines, the totals are worked out again from the saved ones (the tax rate
    // may have changed).
    const saved = await invoicesRepository.listItems(trx, { workspaceId, invoiceId: locked.id });
    const items =
      input.items ??
      saved.map((row) => {
        return {
          description: row.description,
          quantityMilli: row.quantity_milli,
          unitPriceMinor: row.unit_price_minor,
        };
      });
    const totals = totalsFor(items, taxRateBps);

    await invoicesRepository.update(trx, {
      workspaceId,
      id: locked.id,
      values: {
        client_id: clientId,
        project_id: projectId,
        currency: input.currency ?? current.currency,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate_bps: taxRateBps,
        notes: input.notes === undefined ? current.notes : input.notes,
        subtotal_minor: totals.subtotal,
        tax_minor: totals.taxAmount,
        total_minor: totals.total,
      },
    });

    if (input.items) {
      await invoicesRepository.deleteItems(trx, { workspaceId, invoiceId: locked.id });
      await invoicesRepository.insertItems(
        trx,
        itemRows(workspaceId, locked.id, items, totals.lineTotals),
      );
    }

    return locked.id;
  });

  return getInvoice({ workspaceId, invoiceId: id });
};

// Draft -> sent. The invoice gets its number here, so numbers have no gaps. Once it is saved,
// the client's portal users are emailed. A mail problem is logged and never undoes the send.
export const sendInvoice = async ({ workspaceId, invoiceId }) => {
  const id = await db.transaction(async (trx) => {
    const locked = await lockInvoice(trx, workspaceId, invoiceId);

    requireStatus(locked, "draft", "INVOICE_NOT_DRAFT", "This invoice was already sent");

    const current = await loadInvoice(trx, workspaceId, locked.id);
    const items = await invoicesRepository.listItems(trx, { workspaceId, invoiceId: locked.id });

    if (items.length === 0) {
      throw invalid({ items: "Add at least one line before sending" });
    }
    if (current.total_minor <= 0) {
      throw invalid({ items: "An invoice needs a total above zero" });
    }

    const number = await invoicesRepository.nextNumber(trx, { workspaceId });

    await invoicesRepository.update(trx, {
      workspaceId,
      id: locked.id,
      values: { status: "sent", number, sent_at: trx.fn.now() },
    });

    return locked.id;
  });

  let emailed = 0;

  try {
    const result = await deliverInvoice({ workspaceId, invoiceId: id, resend: false });

    emailed = result.sent;
  } catch (error) {
    logger.error({ err: error, invoiceId: id }, "invoice email failed");
  }

  const saved = await getInvoice({ workspaceId, invoiceId: id });

  return { ...saved, emailed };
};

export const voidInvoice = async ({ workspaceId, invoiceId }) => {
  const id = await db.transaction(async (trx) => {
    const locked = await lockInvoice(trx, workspaceId, invoiceId);

    requireStatus(
      locked,
      "sent",
      "INVOICE_NOT_VOIDABLE",
      "Only a sent invoice can be voided. Delete a draft instead.",
    );

    await invoicesRepository.update(trx, {
      workspaceId,
      id: locked.id,
      values: { status: "void", voided_at: trx.fn.now() },
    });

    return locked.id;
  });

  return getInvoice({ workspaceId, invoiceId: id });
};

export const deleteInvoice = async ({ workspaceId, invoiceId }) => {
  await db.transaction(async (trx) => {
    const locked = await lockInvoice(trx, workspaceId, invoiceId);

    requireStatus(
      locked,
      "draft",
      "INVOICE_NOT_DELETABLE",
      "Only drafts can be deleted. Void a sent invoice instead.",
    );

    await invoicesRepository.remove(trx, { workspaceId, id: locked.id });
  });
};

// The invoice as a PDF, plus the name to save it under.
export const getInvoicePdf = async ({ workspaceId, invoiceId }) => {
  const row = await loadInvoice(db, workspaceId, invoiceId);
  const [items, client, workspace] = await Promise.all([
    invoicesRepository.listItems(db, { workspaceId, invoiceId: row.id }),
    invoicesRepository.findBillTo(db, { workspaceId, clientId: row.client_id }),
    invoicesRepository.findWorkspace(db, { workspaceId }),
  ]);
  const invoice = toInvoice(row, items);
  const pdf = await renderInvoicePdf({
    invoice,
    items: invoice.items,
    client: {
      companyName: client.company_name,
      billingAddress: client.billing_address,
      billingEmail: client.billing_email,
      taxId: client.tax_id,
    },
    issuer: { name: workspace.name },
  });

  return {
    pdf,
    filename: invoice.label ? `${invoice.label}.pdf` : `draft-${row.id.slice(0, 8)}.pdf`,
  };
};

// Emails a sent invoice to the client's portal users again.
export const emailInvoice = async ({ workspaceId, invoiceId }) => {
  const row = await loadInvoice(db, workspaceId, invoiceId);

  if (row.status !== "sent") {
    throw new AppError(409, "INVOICE_NOT_EMAILABLE", "Only a sent invoice can be emailed");
  }
  if (
    row.last_emailed_at &&
    Date.now() - new Date(row.last_emailed_at).getTime() < EMAIL_COOLDOWN_MS
  ) {
    throw new AppError(
      429,
      "INVOICE_EMAILED_RECENTLY",
      "This invoice was just emailed. Wait a minute before sending it again.",
    );
  }

  const result = await deliverInvoice({
    workspaceId,
    invoiceId: row.id,
    resend: row.email_count > 0,
  });

  if (result.recipients === 0) {
    throw new AppError(
      409,
      "NO_PORTAL_USERS",
      "Nobody has portal access to this client yet. Give someone access first.",
    );
  }
  if (result.sent === 0) {
    throw new AppError(502, "EMAIL_FAILED", "We couldn't send the email. Try again in a moment.");
  }

  const saved = await getInvoice({ workspaceId, invoiceId: row.id });

  return { ...saved, emailed: result.sent };
};
