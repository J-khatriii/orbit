import { api } from "../../lib/api.js";

export const workspacesApi = {
  update: (workspaceId, changes) => {
    return api.patch(`/workspaces/${workspaceId}`, changes);
  },
};
