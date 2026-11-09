import "../db/typeParsers.js";

const TASK_COLUMNS = [
  "id",
  "project_id",
  "title",
  "description",
  "status",
  "priority",
  "assignee_id",
  "due_date",
  "position",
  "client_visible",
  "completed_at",
  "created_at",
  "updated_at",
];

// A project never has more than this many tasks on one board request.
const LIST_LIMIT = 1000;

const baseQuery = (executor) => {
  return executor("tasks").leftJoin("users", "users.id", "tasks.assignee_id");
};

const selectColumns = () => {
  return [
    ...TASK_COLUMNS.map((column) => {
      return `tasks.${column}`;
    }),
    "users.name as assignee_name",
    "users.avatar_url as assignee_avatar_url",
  ];
};

export const list = async (executor, { workspaceId, projectId, status, assigneeId }) => {
  const query = baseQuery(executor).where({
    "tasks.workspace_id": workspaceId,
    "tasks.project_id": projectId,
  });

  if (status) {
    query.where("tasks.status", status);
  }
  if (assigneeId) {
    query.where("tasks.assignee_id", assigneeId);
  }

  return query
    .select(selectColumns())
    .orderByRaw(
      "CASE tasks.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'in_review' THEN 3 ELSE 4 END",
    )
    .orderBy([{ column: "tasks.position" }, { column: "tasks.id" }])
    .limit(LIST_LIMIT);
};

export const findById = async (executor, { workspaceId, projectId, id }) => {
  return baseQuery(executor)
    .where({
      "tasks.workspace_id": workspaceId,
      "tasks.project_id": projectId,
      "tasks.id": id,
    })
    .first(selectColumns());
};

export const create = async (executor, columns) => {
  const [row] = await executor("tasks").insert(columns).returning("id");

  return row;
};

export const update = async (executor, { workspaceId, id, columns }) => {
  await executor("tasks")
    .where({ workspace_id: workspaceId, id })
    .update({ ...columns, updated_at: executor.fn.now() });
};

export const remove = async (executor, { workspaceId, id }) => {
  await executor("tasks").where({ workspace_id: workspaceId, id }).del();
};

// The highest position in a column, or null if it's empty.
export const maxPosition = async (executor, { projectId, status }) => {
  const row = await executor("tasks")
    .where({ project_id: projectId, status })
    .max({ max: "position" })
    .first();

  return row.max;
};

// One column's tasks in order, without the task being moved.
export const listColumn = async (executor, { projectId, status, excludeId }) => {
  return executor("tasks")
    .where({ project_id: projectId, status })
    .whereNot("id", excludeId)
    .orderBy([{ column: "position" }, { column: "id" }])
    .select(["id", "position"]);
};

// Respaces a column to 1000, 2000, 3000... keeping its order. Used when two neighbours
// have no room left between them.
export const renumberColumn = async (executor, { projectId, status }) => {
  await executor.raw(
    `UPDATE tasks SET position = ranked.new_position
     FROM (
       SELECT id, (row_number() OVER (ORDER BY position, id) * 1000)::int AS new_position
       FROM tasks
       WHERE project_id = ? AND status = ?
     ) AS ranked
     WHERE tasks.id = ranked.id`,
    [projectId, status],
  );
};

const PRIORITY_RANK =
  "CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END";

// One person's tasks in the workspace's live (not archived) projects, with where each lives.
// Open work comes soonest-due first (no due date last, then most urgent), finished work
// most recently completed first.
export const listAssignedTo = async (executor, { workspaceId, userId, view, limit, offset }) => {
  const filtered = () => {
    const query = executor("tasks")
      .join("projects", "projects.id", "tasks.project_id")
      .join("clients", "clients.id", "projects.client_id")
      .where({ "tasks.workspace_id": workspaceId, "tasks.assignee_id": userId })
      .whereNull("projects.archived_at");

    if (view === "open") {
      query.whereNot("tasks.status", "done");
    } else if (view === "done") {
      query.where("tasks.status", "done");
    }

    return query;
  };

  const countRow = await filtered().count({ count: "*" }).first();
  const rows = await filtered()
    .leftJoin("users", "users.id", "tasks.assignee_id")
    .select([
      ...selectColumns(),
      "projects.name as project_name",
      "projects.client_id as client_id",
      "clients.company_name as client_name",
    ])
    .modify((query) => {
      if (view === "done") {
        query.orderBy([{ column: "tasks.completed_at", order: "desc" }, { column: "tasks.id" }]);
      } else {
        query
          .orderByRaw("tasks.due_date ASC NULLS LAST")
          .orderByRaw(PRIORITY_RANK)
          .orderBy([{ column: "tasks.created_at" }, { column: "tasks.id" }]);
      }
    })
    .limit(limit)
    .offset(offset);

  return { rows, total: Number(countRow.count) };
};

export const createMany = async (executor, rows) => {
  if (rows.length > 0) {
    await executor("tasks").insert(rows);
  }
};
