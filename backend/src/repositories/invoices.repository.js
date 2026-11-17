import "../db/typeParsers.js";

const columns = (executor) => {
  return [
    "invoices.id",
    "invoices.client_id",
    "invoices.project_id",
    "invoices.number",
    "invoices.status",
    "invoices.currency",
    "invoices.issue_date",
    "invoices.due_date",
    "invoices.tax_rate_bps",
    "invoices.subtotal_minor",
    "invoices.tax_minor",
    "invoices.total_minor",
    "invoices.notes",
    "invoices.sent_at",
    "invoices.voided_at",
    "invoices.last_emailed_at",
    "invoices.email_count",
    "invoices.created_at",
    "invoices.updated_at",
    "clients.company_name as client_name",
    "projects.name as project_name",
    // "Overdue" is worked out, never stored.
    executor.raw("(invoices.status = 'sent' AND invoices.due_date < CURRENT_DATE) AS overdue"),
  ];
};

const withJoins = (executor) => {
  return executor("invoices")
    .join("clients", "clients.id", "invoices.client_id")
    .leftJoin("projects", "projects.id", "invoices.project_id");
};

const filtered = (executor, { workspaceId, clientId, status }) => {
  const query = withJoins(executor).where("invoices.workspace_id", workspaceId);

  if (clientId) {
    query.where("invoices.client_id", clientId);
  }
  if (status === "overdue") {
    query.where("invoices.status", "sent").whereRaw("invoices.due_date < CURRENT_DATE");
  } else if (status) {
    query.where("invoices.status", status);
  }

  return query;
};

export const findClient = async (executor, { workspaceId, clientId }) => {
  return executor("clients").where({ workspace_id: workspaceId, id: clientId }).first(["id"]);
};

export const findProject = async (executor, { workspaceId, projectId }) => {
  return executor("projects")
    .where({ workspace_id: workspaceId, id: projectId })
    .first(["id", "client_id"]);
};

export const list = async (executor, { limit, offset, ...filters }) => {
  return filtered(executor, filters)
    .orderBy([
      { column: "invoices.created_at", order: "desc" },
      { column: "invoices.id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset)
    .select(columns(executor));
};

export const count = async (executor, filters) => {
  const row = await filtered(executor, filters).count("* as total").first();

  return Number(row.total);
};

export const findById = async (executor, { workspaceId, id }) => {
  return withJoins(executor)
    .where({ "invoices.workspace_id": workspaceId, "invoices.id": id })
    .first(columns(executor));
};

// Locks the row until the transaction ends, so two requests can't change it at once.
export const lock = async (executor, { workspaceId, id }) => {
  return executor("invoices")
    .where({ workspace_id: workspaceId, id })
    .forUpdate()
    .first(["id", "status"]);
};

export const listItems = async (executor, { workspaceId, invoiceId }) => {
  return executor("invoice_items")
    .where({ workspace_id: workspaceId, invoice_id: invoiceId })
    .orderBy("position")
    .select([
      "id",
      "position",
      "description",
      "quantity_milli",
      "unit_price_minor",
      "line_total_minor",
    ]);
};

export const insert = async (executor, values) => {
  const [row] = await executor("invoices").insert(values).returning("id");

  return row;
};

export const insertItems = async (executor, rows) => {
  if (rows.length > 0) {
    await executor("invoice_items").insert(rows);
  }
};

export const deleteItems = async (executor, { workspaceId, invoiceId }) => {
  await executor("invoice_items").where({ workspace_id: workspaceId, invoice_id: invoiceId }).del();
};

export const update = async (executor, { workspaceId, id, values }) => {
  await executor("invoices")
    .where({ workspace_id: workspaceId, id })
    .update({ ...values, updated_at: executor.fn.now() });
};

export const remove = async (executor, { workspaceId, id }) => {
  await executor("invoices").where({ workspace_id: workspaceId, id }).del();
};

// The next invoice number for a workspace. One atomic statement: concurrent requests queue
// on the counter's row lock, so numbers never repeat, and if the transaction rolls back the
// number is given back, so there are no gaps.
export const nextNumber = async (executor, { workspaceId }) => {
  const result = await executor.raw(
    `INSERT INTO invoice_counters (workspace_id, last_number) VALUES (?, 1)
     ON CONFLICT (workspace_id)
     DO UPDATE SET last_number = invoice_counters.last_number + 1
     RETURNING last_number`,
    [workspaceId],
  );

  return result.rows[0].last_number;
};

// What the PDF needs about who is being billed, and who is billing.
export const findBillTo = async (executor, { workspaceId, clientId }) => {
  return executor("clients")
    .where({ workspace_id: workspaceId, id: clientId })
    .first(["company_name", "billing_address", "billing_email", "tax_id"]);
};

export const findWorkspace = async (executor, { workspaceId }) => {
  return executor("workspaces").where({ id: workspaceId }).first(["name"]);
};

// One more time the invoice has gone out by email.
export const recordEmailed = async (executor, { workspaceId, id }) => {
  await executor("invoices")
    .where({ workspace_id: workspaceId, id })
    .update({
      last_emailed_at: executor.fn.now(),
      email_count: executor.raw("email_count + 1"),
    });
};
