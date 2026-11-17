import "../db/typeParsers.js";

const projectColumns = (executor) => {
  return [
    "projects.id",
    "projects.name",
    "projects.status",
    "projects.client_id",
    "projects.start_date",
    "projects.due_date",
    "clients.company_name as client_name",
    // Progress counts only what the client may see.
    executor.raw(
      "(SELECT count(*) FROM tasks t WHERE t.project_id = projects.id AND t.client_visible) AS task_count",
    ),
    executor.raw(
      "(SELECT count(*) FROM tasks t WHERE t.project_id = projects.id AND t.client_visible AND t.status = 'done') AS tasks_done",
    ),
  ];
};

const visibleProjects = (executor, { workspaceId, clientIds }) => {
  return executor("projects")
    .join("clients", "clients.id", "projects.client_id")
    .where("projects.workspace_id", workspaceId)
    .whereIn("projects.client_id", clientIds)
    .whereNull("projects.archived_at");
};

export const listProjects = async (executor, filters) => {
  return visibleProjects(executor, filters)
    .orderBy([
      { column: "clients.company_name" },
      { column: "projects.name" },
      { column: "projects.id" },
    ])
    .select(projectColumns(executor));
};

export const findProject = async (executor, { projectId, ...filters }) => {
  return visibleProjects(executor, filters)
    .where("projects.id", projectId)
    .first(projectColumns(executor));
};

export const listTasks = async (executor, { workspaceId, projectId }) => {
  return executor("tasks")
    .where({ workspace_id: workspaceId, project_id: projectId, client_visible: true })
    .orderBy([{ column: "position" }, { column: "id" }])
    .select(["id", "title", "description", "status", "due_date", "completed_at"]);
};

export const listClients = async (executor, { workspaceId, clientIds }) => {
  return executor("clients")
    .where("workspace_id", workspaceId)
    .whereIn("id", clientIds)
    .whereNull("archived_at")
    .orderBy([{ column: "company_name" }, { column: "id" }])
    .select(["id", "company_name"]);
};

export const findClient = async (executor, { workspaceId, clientId }) => {
  return executor("clients")
    .where({ workspace_id: workspaceId, id: clientId })
    .whereNull("archived_at")
    .first(["id", "company_name"]);
};

// A client sees a file only if it's shared, belongs to a client they can access, and that
// client isn't archived.
const visibleFiles = (executor, { workspaceId, clientIds }) => {
  return executor("files")
    .join("clients", "clients.id", "files.client_id")
    .where("files.workspace_id", workspaceId)
    .whereIn("files.client_id", clientIds)
    .where("files.client_visible", true)
    .whereNull("clients.archived_at");
};

const FILE_COLUMNS = [
  "files.id",
  "files.client_id",
  "files.name",
  "files.content_type",
  "files.size_bytes",
  "files.created_at",
  "clients.company_name as client_name",
];

export const listFiles = async (executor, { limit, offset, ...filters }) => {
  return visibleFiles(executor, filters)
    .orderBy([
      { column: "files.created_at", order: "desc" },
      { column: "files.id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset)
    .select(FILE_COLUMNS);
};

export const countFiles = async (executor, filters) => {
  const row = await visibleFiles(executor, filters).count("* as total").first();

  return Number(row.total);
};

// Includes where the bytes are, for the download route only.
export const findFile = async (executor, { fileId, ...filters }) => {
  return visibleFiles(executor, filters)
    .where("files.id", fileId)
    .first([...FILE_COLUMNS, "files.storage_key"]);
};

// A client sees an invoice only if it has been sent (never a draft), it belongs to a client
// they can access, and that client isn't archived.
const visibleInvoices = (executor, { workspaceId, clientIds }) => {
  return executor("invoices")
    .join("clients", "clients.id", "invoices.client_id")
    .leftJoin("projects", "projects.id", "invoices.project_id")
    .where("invoices.workspace_id", workspaceId)
    .whereIn("invoices.client_id", clientIds)
    .whereNot("invoices.status", "draft")
    .whereNull("clients.archived_at");
};

const invoiceColumns = (executor) => {
  return [
    "invoices.id",
    "invoices.client_id",
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
    "clients.company_name as client_name",
    "projects.name as project_name",
    executor.raw("(invoices.status = 'sent' AND invoices.due_date < CURRENT_DATE) AS overdue"),
  ];
};

export const listInvoices = async (executor, { limit, offset, ...filters }) => {
  return visibleInvoices(executor, filters)
    .orderBy([
      { column: "invoices.sent_at", order: "desc" },
      { column: "invoices.id", order: "desc" },
    ])
    .limit(limit)
    .offset(offset)
    .select(invoiceColumns(executor));
};

export const countInvoices = async (executor, filters) => {
  const row = await visibleInvoices(executor, filters).count("* as total").first();

  return Number(row.total);
};

export const findInvoice = async (executor, { invoiceId, ...filters }) => {
  return visibleInvoices(executor, filters)
    .where("invoices.id", invoiceId)
    .first(invoiceColumns(executor));
};
