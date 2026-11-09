import { api } from "../../lib/api.js";

export const templatesApi = {
  list: (workspaceId) => {
    return api.get(`/workspaces/${workspaceId}/templates`);
  },
  get: (workspaceId, templateId) => {
    return api.get(`/workspaces/${workspaceId}/templates/${templateId}`);
  },
  create: ({ workspaceId, input }) => {
    return api.post(`/workspaces/${workspaceId}/templates`, input);
  },
  update: ({ workspaceId, templateId, input }) => {
    return api.patch(`/workspaces/${workspaceId}/templates/${templateId}`, input);
  },
  remove: ({ workspaceId, templateId }) => {
    return api.delete(`/workspaces/${workspaceId}/templates/${templateId}`);
  },
  saveFromProject: ({ workspaceId, projectId, input }) => {
    return api.post(`/workspaces/${workspaceId}/projects/${projectId}/save-as-template`, input);
  },
};
