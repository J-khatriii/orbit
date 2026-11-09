import "../db/typeParsers.js";
import { GAP } from "../utils/ordering.js";

const TEMPLATE_COLUMNS = ["id", "name", "description", "created_at", "updated_at"];

const selectColumns = (executor) => {
  return [
    ...TEMPLATE_COLUMNS.map((column) => {
      return `project_templates.${column}`;
    }),
    executor.raw(
      "(SELECT count(*) FROM project_template_tasks t WHERE t.template_id = project_templates.id) AS task_count",
    ),
  ];
};

export const list = async (executor, workspaceId) => {
  return executor("project_templates")
    .where("project_templates.workspace_id", workspaceId)
    .orderBy([{ column: "project_templates.name" }, { column: "project_templates.id" }])
    .select(selectColumns(executor));
};

export const findById = async (executor, { workspaceId, id }) => {
  return executor("project_templates")
    .where({ "project_templates.workspace_id": workspaceId, "project_templates.id": id })
    .first(selectColumns(executor));
};

export const create = async (executor, columns) => {
  const [row] = await executor("project_templates").insert(columns).returning("id");

  return row;
};

export const update = async (executor, { workspaceId, id, columns }) => {
  await executor("project_templates")
    .where({ workspace_id: workspaceId, id })
    .update({ ...columns, updated_at: executor.fn.now() });
};

export const remove = async (executor, { workspaceId, id }) => {
  await executor("project_templates").where({ workspace_id: workspaceId, id }).del();
};

export const listTasks = async (executor, { workspaceId, templateId }) => {
  return executor("project_template_tasks")
    .where({ workspace_id: workspaceId, template_id: templateId })
    .orderBy([{ column: "position" }, { column: "id" }])
    .select(["id", "title", "description", "priority", "due_offset_days", "position"]);
};

// Tasks come in as the list order the person chose. Positions are numbered from it.
export const insertTasks = async (executor, { workspaceId, templateId, tasks }) => {
  if (tasks.length === 0) {
    return;
  }

  await executor("project_template_tasks").insert(
    tasks.map((task, index) => {
      return {
        workspace_id: workspaceId,
        template_id: templateId,
        title: task.title,
        description: task.description ?? null,
        priority: task.priority ?? "medium",
        due_offset_days: task.dueOffsetDays ?? null,
        position: (index + 1) * GAP,
      };
    }),
  );
};

export const replaceTasks = async (executor, { workspaceId, templateId, tasks }) => {
  await executor("project_template_tasks")
    .where({ workspace_id: workspaceId, template_id: templateId })
    .del();
  await insertTasks(executor, { workspaceId, templateId, tasks });
};
