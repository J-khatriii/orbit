import { api } from "../../lib/api.js";

const tasksUrl = (workspaceId, projectId) => {
  return `/workspaces/${workspaceId}/projects/${projectId}/tasks`;
};

export const tasksApi = {
  list: (workspaceId, projectId) => {
    return api.get(tasksUrl(workspaceId, projectId));
  },
  create: ({ workspaceId, projectId, input }) => {
    return api.post(tasksUrl(workspaceId, projectId), input);
  },
  update: ({ workspaceId, projectId, taskId, input }) => {
    return api.patch(`${tasksUrl(workspaceId, projectId)}/${taskId}`, input);
  },
  move: ({ workspaceId, projectId, taskId, input }) => {
    return api.post(`${tasksUrl(workspaceId, projectId)}/${taskId}/move`, input);
  },
  remove: ({ workspaceId, projectId, taskId }) => {
    return api.delete(`${tasksUrl(workspaceId, projectId)}/${taskId}`);
  },
};
