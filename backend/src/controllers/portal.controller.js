import * as portalService from "../services/portal.service.js";

export const listProjects = async (req, res) => {
  const result = await portalService.listProjects({
    workspaceId: req.workspace.id,
    userId: req.user.id,
  });

  res.json(result);
};

export const getProject = async (req, res) => {
  const result = await portalService.getProject({
    workspaceId: req.workspace.id,
    userId: req.user.id,
    projectId: req.params.projectId,
  });

  res.json(result);
};
