import { api } from "../../lib/api.js";

export const portalApi = {
  projects: (workspaceId) => {
    return api.get(`/workspaces/${workspaceId}/portal/projects`);
  },
  project: (workspaceId, projectId) => {
    return api.get(`/workspaces/${workspaceId}/portal/projects/${projectId}`);
  },
};
