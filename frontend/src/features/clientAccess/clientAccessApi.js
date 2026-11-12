import { api } from "../../lib/api.js";

const accessUrl = (workspaceId, clientId) => {
  return `/workspaces/${workspaceId}/clients/${clientId}/access`;
};

export const clientAccessApi = {
  list: (workspaceId, clientId) => {
    return api.get(accessUrl(workspaceId, clientId));
  },
  candidates: (workspaceId, clientId) => {
    return api.get(`${accessUrl(workspaceId, clientId)}/candidates`);
  },
  grant: ({ workspaceId, clientId, userId }) => {
    return api.post(accessUrl(workspaceId, clientId), { userId });
  },
  revoke: ({ workspaceId, clientId, userId }) => {
    return api.delete(`${accessUrl(workspaceId, clientId)}/${userId}`);
  },
};
