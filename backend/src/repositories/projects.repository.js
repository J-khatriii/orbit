import "../db/typeParsers.js";

const PROJECT_COLUMNS = [
  "id",
  "client_id",
  "name",
  "description",
  "status",
  "start_date",
  "due_date",
  "budget_minor",
  "currency",
  "archived_at",
  "created_at",
  "updated_at",
];

const SORT_COLUMNS = {
  name: "projects.name",
  created: "projects.created_at",
  due: "projects.due_date",
};

// Every read returns the same shape: the project, its client's name, and how many people
// are assigned.
const baseQuery = (executor) => {
  return executor("projects").join("clients", "clients.id", "projects.client_id");
};

const selectColumns = (executor) => {
  return [
    ...PROJECT_COLUMNS.map((column) => {
      return `projects.${column}`;
    }),
    "clients.company_name as client_name",
    executor.raw(
      "(SELECT count(*) FROM project_members pm WHERE pm.project_id = projects.id) AS member_count",
    ),
    executor.raw("(SELECT count(*) FROM tasks t WHERE t.project_id = projects.id) AS task_count"),
    executor.raw(
      "(SELECT count(*) FROM tasks t WHERE t.project_id = projects.id AND t.status = 'done') AS tasks_done",
    ),
  ];
};

// Users type % and _ as normal characters. Neutralise them so they aren't wildcards.
const escapeLike = (value) => {
  return value.replace(/[\\%_]/g, "\\$&");
};

const applyFilters = (query, { workspaceId, search, clientId, status, view }) => {
  query.where("projects.workspace_id", workspaceId);

  if (view === "active") {
    query.whereNull("projects.archived_at");
  } else if (view === "archived") {
    query.whereNotNull("projects.archived_at");
  }
  if (clientId) {
    query.where("projects.client_id", clientId);
  }
  if (status) {
    query.where("projects.status", status);
  }
  if (search) {
    const pattern = `%${escapeLike(search)}%`;

    query.where((group) => {
      group.whereILike("projects.name", pattern).orWhereILike("clients.company_name", pattern);
    });
  }

  return query;
};

export const list = async (executor, { sort, order, limit, offset, ...filters }) => {
  const filtered = () => {
    return applyFilters(baseQuery(executor), filters);
  };

  const countRow = await filtered().count({ count: "*" }).first();
  const rows = await filtered()
    .select(selectColumns(executor))
    // Projects without a due date go last, whichever way the list is sorted.
    .orderBy([{ column: SORT_COLUMNS[sort], order, nulls: "last" }, { column: "projects.id" }])
    .limit(limit)
    .offset(offset);

  return { rows, total: Number(countRow.count) };
};

export const findById = async (executor, { workspaceId, id }) => {
  return baseQuery(executor)
    .where({ "projects.workspace_id": workspaceId, "projects.id": id })
    .first(selectColumns(executor));
};

export const create = async (executor, columns) => {
  const [row] = await executor("projects").insert(columns).returning("id");

  return row;
};

export const update = async (executor, { workspaceId, id, columns }) => {
  await executor("projects")
    .where({ workspace_id: workspaceId, id })
    .update({ ...columns, updated_at: executor.fn.now() });
};

export const setArchived = async (executor, { workspaceId, id, archived }) => {
  await executor("projects")
    .where({ workspace_id: workspaceId, id })
    .update({
      archived_at: archived ? executor.fn.now() : null,
      updated_at: executor.fn.now(),
    });
};
