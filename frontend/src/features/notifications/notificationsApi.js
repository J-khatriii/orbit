import { api } from "../../lib/api.js";

const notificationsUrl = (workspaceId) => {
  return `/workspaces/${workspaceId}/notifications`;
};

export const PAGE_SIZE = 20;

export const notificationsApi = {
  list: (workspaceId, view, page) => {
    return api.get(
      `${notificationsUrl(workspaceId)}?view=${view}&page=${page}&pageSize=${PAGE_SIZE}`,
    );
  },
  unread: (workspaceId) => {
    return api.get(`${notificationsUrl(workspaceId)}/unread-count`);
  },
  markRead: ({ workspaceId, input }) => {
    return api.post(`${notificationsUrl(workspaceId)}/read`, input);
  },
};
