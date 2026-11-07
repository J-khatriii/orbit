import * as projectService from "../services/project.service.js";
import * as activityService from "../services/activity.service.js";

// req.workspace comes from workspaceContext, req.user from requireAuth.
export const listProjects = async (req, res) => {
  const result = await projectService.listProjects(req.workspace.id, req.validated.query);

  res.json(result);
};

export const getProject = async (req, res) => {
  const project = await projectService.getProject(req.workspace.id, req.params.projectId);

  res.json({ project });
};

export const createProject = async (req, res) => {
  const project = await projectService.createProject({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    input: req.validated.body,
  });

  res.status(201).json({ project });
};

export const updateProject = async (req, res) => {
  const project = await projectService.updateProject({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    input: req.validated.body,
  });

  res.json({ project });
};

export const archiveProject = async (req, res) => {
  const project = await projectService.setProjectArchived({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    archived: true,
  });

  res.json({ project });
};

export const restoreProject = async (req, res) => {
  const project = await projectService.setProjectArchived({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    archived: false,
  });

  res.json({ project });
};

export const addMember = async (req, res) => {
  const project = await projectService.addProjectMember({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    input: req.validated.body,
  });

  res.status(201).json({ project });
};

export const removeMember = async (req, res) => {
  const project = await projectService.removeProjectMember({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
    memberId: req.params.userId,
  });

  res.json({ project });
};

export const listProjectActivity = async (req, res) => {
  const result = await activityService.listProjectActivity(
    req.workspace.id,
    req.params.projectId,
    req.validated.query,
  );

  res.json(result);
};
