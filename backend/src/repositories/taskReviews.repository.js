import "../db/typeParsers.js";

export const insert = async (executor, columns) => {
  const [row] = await executor("task_reviews").insert(columns).returning(["id", "created_at"]);

  return row;
};

// A task's decisions, newest first, with the reviewer's name.
export const listForTask = async (executor, { workspaceId, taskId }) => {
  return executor("task_reviews")
    .leftJoin("users", "users.id", "task_reviews.reviewer_id")
    .where({ "task_reviews.workspace_id": workspaceId, "task_reviews.task_id": taskId })
    .orderBy([
      { column: "task_reviews.created_at", order: "desc" },
      { column: "task_reviews.id", order: "desc" },
    ])
    .select([
      "task_reviews.id",
      "task_reviews.decision",
      "task_reviews.comment",
      "task_reviews.created_at",
      "task_reviews.reviewer_id",
      "users.name as reviewer_name",
    ]);
};

// A task a client may review: shared with clients, in a live project of a client they can reach.
export const findTaskRef = async (executor, { workspaceId, taskId, clientIds }) => {
  return executor("tasks")
    .join("projects", "projects.id", "tasks.project_id")
    .where({
      "tasks.workspace_id": workspaceId,
      "tasks.id": taskId,
      "tasks.client_visible": true,
    })
    .whereIn("projects.client_id", clientIds)
    .whereNull("projects.archived_at")
    .first(["tasks.id as id", "tasks.project_id as project_id"]);
};

// Holds the task row until the transaction ends, so two decisions can't both succeed.
export const lockTask = async (executor, { workspaceId, taskId }) => {
  await executor("tasks")
    .where({ workspace_id: workspaceId, id: taskId })
    .forUpdate()
    .first(["id"]);
};
