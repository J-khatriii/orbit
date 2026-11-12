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
