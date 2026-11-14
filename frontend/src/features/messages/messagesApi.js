import { api } from "../../lib/api.js";

// Messages per page. Set this to 2 to test "Load earlier messages", then put it back.
export const PAGE_SIZE = 30;

const messagesUrl = (workspaceId, clientId) => {
  return `/workspaces/${workspaceId}/clients/${clientId}/messages`;
};

export const messagesApi = {
  list: (workspaceId, clientId, page) => {
    return api.get(`${messagesUrl(workspaceId, clientId)}?page=${page}&pageSize=${PAGE_SIZE}`);
  },
  create: ({ workspaceId, clientId, input }) => {
    return api.post(messagesUrl(workspaceId, clientId), input);
  },
};
