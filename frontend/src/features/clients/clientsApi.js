import { api } from "../../lib/api.js";

export const clientsApi = {
  // Empty values are left out of the address, so the server uses its own defaults.
  list: (workspaceId, filters) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, String(value));
      }
    }

    return api.get(`/workspaces/${workspaceId}/clients?${params.toString()}`);
  },
  tags: (workspaceId) => {
    return api.get(`/workspaces/${workspaceId}/clients/tags`);
  },
  get: (workspaceId, clientId) => {
    return api.get(`/workspaces/${workspaceId}/clients/${clientId}`);
  },
  activity: (workspaceId, clientId, pageSize) => {
    return api.get(`/workspaces/${workspaceId}/clients/${clientId}/activity?pageSize=${pageSize}`);
  },
  create: ({ workspaceId, input }) => {
    return api.post(`/workspaces/${workspaceId}/clients`, input);
  },
  update: ({ workspaceId, clientId, input }) => {
    return api.patch(`/workspaces/${workspaceId}/clients/${clientId}`, input);
  },
  setArchived: ({ workspaceId, clientId, archived }) => {
    return api.post(
      `/workspaces/${workspaceId}/clients/${clientId}/${archived ? "archive" : "restore"}`,
    );
  },
};
