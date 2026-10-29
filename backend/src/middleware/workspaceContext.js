import { db } from "../db/knex.js";
import * as workspacesRepository from "../repositories/workspaces.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";

const workspaceNotFound = () => {
  return new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
};

export const workspaceContext = async (req, res, next) => {
  const { workspaceId } = req.params;

  if (!isUuid(workspaceId)) {
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
