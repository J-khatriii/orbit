import { api } from "../../lib/api.js";

export const projectsApi = {
  list: (workspaceId, filters) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, String(value));
      }
    }

    return api.get(`/workspaces/${workspaceId}/projects?${params.toString()}`);
  },
  get: (workspaceId, projectId) => {
    return api.get(`/workspaces/${workspaceId}/projects/${projectId}`);
  },
  activity: (workspaceId, projectId, pageSize) => {
    return api.get(
      `/workspaces/${workspaceId}/projects/${projectId}/activity?page=1&pageSize=${pageSize}`,
    );
  },
  create: ({ workspaceId, input }) => {
    return api.post(`/workspaces/${workspaceId}/projects`, input);
  },
  update: ({ workspaceId, projectId, input }) => {
    return api.patch(`/workspaces/${workspaceId}/projects/${projectId}`, input);
  },
  setArchived: ({ workspaceId, projectId, archived }) => {
    return api.post(
      `/workspaces/${workspaceId}/projects/${projectId}/${archived ? "archive" : "restore"}`,
    );
  },
  addMember: ({ workspaceId, projectId, input }) => {
    return api.post(`/workspaces/${workspaceId}/projects/${projectId}/members`, input);
  },
  removeMember: ({ workspaceId, projectId, userId }) => {
    return api.delete(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`);
  },
};
