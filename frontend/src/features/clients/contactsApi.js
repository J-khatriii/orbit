import { api } from "../../lib/api.js";

const base = (workspaceId, clientId) => {
  return `/workspaces/${workspaceId}/clients/${clientId}/contacts`;
};

export const contactsApi = {
  list: (workspaceId, clientId) => {
    return api.get(base(workspaceId, clientId));
  },
  create: ({ workspaceId, clientId, input }) => {
    return api.post(base(workspaceId, clientId), input);
  },
  update: ({ workspaceId, clientId, contactId, input }) => {
    return api.patch(`${base(workspaceId, clientId)}/${contactId}`, input);
  },
  remove: ({ workspaceId, clientId, contactId }) => {
    return api.delete(`${base(workspaceId, clientId)}/${contactId}`);
  },
};
