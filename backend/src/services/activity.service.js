import { db } from "../db/knex.js";
import * as activityRepository from "../repositories/activity.repository.js";
import { getClient } from "./client.service.js";
import { toActivity } from "./serializers.js";
import { getProject } from "./project.service.js";

// Call this inside the same transaction as the change it describes, so the two
// succeed or fail together.
//   entityType   "client", later "contact", "project", "task", ...
//   action       "client.created", "client.updated", ...
//   metadata     a few details for displaying the event. Never put secrets or notes here.
export const recordActivity = async (
  executor,
  { workspaceId, actorId, entityType, entityId, clientId = null, action, metadata = {} },
) => {
  await activityRepository.create(executor, {
    workspace_id: workspaceId,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    client_id: clientId,
    action,
    metadata,
  });
};

const listPage = async ({ workspaceId, clientId, entityType, entityId, page, pageSize }) => {
  const { rows, total } = await activityRepository.list(db, {
    workspaceId,
    clientId,
    entityType,
    entityId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    activity: rows.map((row) => {
      return toActivity(row);
    }),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
};
export const listWorkspaceActivity = async (workspaceId, query) => {
  return listPage({ workspaceId, ...query });
};

export const listClientActivity = async (workspaceId, clientId, query) => {
  // Throws 404 if the client isn't in this workspace.
  await getClient(workspaceId, clientId);

  return listPage({ workspaceId, clientId, ...query });
};

export const listProjectActivity = async (workspaceId, projectId, query) => {
  // Throws 404 if the project isn't in this workspace (or the id is malformed).
  await getProject(workspaceId, projectId);

  return listPage({ workspaceId, entityType: "project", entityId: projectId, ...query });
};
