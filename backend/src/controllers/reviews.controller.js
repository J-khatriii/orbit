import * as reviewService from "../services/review.service.js";

// Portal: a client decides on a task.
export const reviewTask = async (req, res) => {
  const result = await reviewService.reviewTask({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    taskId: req.params.taskId,
    input: req.validated.body,
  });

  res.json(result);
};

// Team: the decisions made on a task.
export const listTaskReviews = async (req, res) => {
  const result = await reviewService.listTaskReviews({
    workspaceId: req.workspace.id,
    projectId: req.params.projectId,
    taskId: req.params.taskId,
  });

  res.json(result);
};
