import { api } from "../../lib/api.js";
import { PAGE_SIZE } from "../messages/messagesApi.js";

const portalUrl = (workspaceId) => {
  return `/workspaces/${workspaceId}/portal`;
};

export const portalApi = {
  projects: (workspaceId) => {
    return api.get(`${portalUrl(workspaceId)}/projects`);
  },
  project: (workspaceId, projectId) => {
    return api.get(`${portalUrl(workspaceId)}/projects/${projectId}`);
  },
  clients: (workspaceId) => {
    return api.get(`${portalUrl(workspaceId)}/clients`);
  },
  messages: (workspaceId, clientId, page) => {
    return api.get(
      `${portalUrl(workspaceId)}/clients/${clientId}/messages?page=${page}&pageSize=${PAGE_SIZE}`,
    );
  },
  sendMessage: ({ workspaceId, clientId, input }) => {
    return api.post(`${portalUrl(workspaceId)}/clients/${clientId}/messages`, input);
  },
  review: ({ workspaceId, taskId, input }) => {
    return api.post(`${portalUrl(workspaceId)}/tasks/${taskId}/review`, input);
  },
};
