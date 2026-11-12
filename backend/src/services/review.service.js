import { db } from "../db/knex.js";
import * as taskReviewsRepository from "../repositories/taskReviews.repository.js";
import * as tasksRepository from "../repositories/tasks.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { listAccessibleClientIds } from "./clientAccess.service.js";
import { loadProject } from "./project.service.js";
import { toPortalTask, toReview } from "./serializers.js";
import { ensureEditable, loadTask, placeTask } from "./task.service.js";

// Where a task goes when the client decides.
const NEXT_STATUS = {
  approved: "done",
  changes_requested: "in_progress",
};

export const reviewTask = async ({ workspaceId, userId, taskId, input }) => {
  const comment = input.comment || null;

  if (input.decision === "changes_requested" && !comment) {
    throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", {
      fields: { comment: "Say what should change" },
    });
  }

  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const ref =
    clientIds.length > 0 && isUuid(taskId)
      ? await taskReviewsRepository.findTaskRef(db, { workspaceId, taskId, clientIds })
      : undefined;

  // The same answer whether the task doesn't exist, isn't shared, or belongs to someone else.
  if (!ref) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  await db.transaction(async (trx) => {
    await taskReviewsRepository.lockTask(trx, { workspaceId, taskId: ref.id });

    const project = await loadProject(trx, workspaceId, ref.project_id);

    ensureEditable(project);

    const before = await loadTask(trx, workspaceId, project.id, ref.id);

    if (before.status !== "in_review") {
      throw new AppError(409, "TASK_NOT_IN_REVIEW", "This task isn't waiting for your review");
    }

    await placeTask(trx, {
      workspaceId,
      userId,
      project,
      before,
      status: NEXT_STATUS[input.decision],
      afterTaskId: null,
    });
    await taskReviewsRepository.insert(trx, {
      workspace_id: workspaceId,
      task_id: ref.id,
      reviewer_id: userId,
      decision: input.decision,
      comment,
    });
  });

  const row = await tasksRepository.findById(db, {
    workspaceId,
    projectId: ref.project_id,
    id: ref.id,
  });

  return { task: toPortalTask(row) };
};

// For the team: a task's decisions, newest first.
export const listTaskReviews = async ({ workspaceId, projectId, taskId }) => {
  const project = await loadProject(db, workspaceId, projectId);
  const task = await loadTask(db, workspaceId, project.id, taskId);
  const rows = await taskReviewsRepository.listForTask(db, { workspaceId, taskId: task.id });

  return {
    reviews: rows.map((row) => {
      return toReview(row);
    }),
  };
};
