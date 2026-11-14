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
