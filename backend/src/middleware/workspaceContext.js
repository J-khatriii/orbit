import { db } from "../db/knex.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";
import { AppError } from "../utils/AppError.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const workspaceNotFound = () => {
  return new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
};

export const workspaceContext = async (req, res, next) => {
  const { workspaceId } = req.params;

  if (!UUID_PATTERN.test(workspaceId)) {
    throw workspaceNotFound();
  }

  const row = await workspacesRepository.findForMember(db, {
    workspaceId,
    userId: req.user.id,
  });

  if (!row) {
    throw workspaceNotFound();
  }

  const { role, ...workspace } = row;

  req.workspace = workspace;
  req.membership = { role };

  return next();
};
