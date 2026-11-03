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
};
