import * as taskService from "../services/task.service.js";

// The project id comes from the URL the tasks routes are mounted under.
export const listTasks = async (req, res) => {
  const result = await taskService.listTasks(
    req.workspace.id,
    req.params.projectId,
    req.validated.query,
  );

  res.json(result);
};

export const getTask = async (req, res) => {
  const task = await taskService.getTask(req.workspace.id, req.params.projectId, req.params.taskId);

  res.json({ task });
};

export const createTask = async (req, res) => {
  const task = await taskService.createTask({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    input: req.validated.body,
  });

  res.status(201).json({ task });
};

export const updateTask = async (req, res) => {
  const task = await taskService.updateTask({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    taskId: req.params.taskId,
    input: req.validated.body,
  });

  res.json({ task });
};

export const moveTask = async (req, res) => {
  const task = await taskService.moveTask({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    taskId: req.params.taskId,
    input: req.validated.body,
  });

  res.json({ task });
};

export const deleteTask = async (req, res) => {
  await taskService.deleteTask({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    taskId: req.params.taskId,
  });

  res.status(204).end();
};

export const listMyTasks = async (req, res) => {
  const result = await taskService.listMyTasks(req.workspace.id, req.user.id, req.validated.query);

  res.json(result);
};
