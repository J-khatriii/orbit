import { db } from "../db/knex.js";
import * as portalRepository from "../repositories/portal.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { listAccessibleClientIds } from "./clientAccess.service.js";
import { toPortalProject, toPortalTask } from "./serializers.js";

export const listProjects = async ({ workspaceId, userId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);

  if (clientIds.length === 0) {
    return { projects: [] };
  }

  const rows = await portalRepository.listProjects(db, { workspaceId, clientIds });

  return {
    projects: rows.map((row) => {
      return toPortalProject(row);
    }),
  };
};

export const getProject = async ({ workspaceId, userId, projectId }) => {
  const clientIds = await listAccessibleClientIds(workspaceId, userId);
  const row =
    clientIds.length > 0 && isUuid(projectId)
      ? await portalRepository.findProject(db, { workspaceId, clientIds, projectId })
      : undefined;

  // The same answer whether the project doesn't exist or belongs to someone else.
  if (!row) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const tasks = await portalRepository.listTasks(db, { workspaceId, projectId: row.id });

  return {
    project: toPortalProject(row),
    tasks: tasks.map((task) => {
      return toPortalTask(task);
    }),
  };
};
