import * as workspaceService from "../services/workspace.service.js";
import { toWorkspace } from "../services/serializers.js";

export const getWorkspace = async (req, res) => {
  res.json({ workspace: toWorkspace(req.workspace, req.membership.role) });
};

export const updateWorkspace = async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(
    req.workspace.id,
    req.validated.body,
    req.membership.role,
  );

  res.json({ workspace });
};

export const listMembers = async (req, res) => {
  const members = await workspaceService.listMembers(req.workspace.id);

  res.json({ members });
};
