import { api } from "../../lib/api.js";
import { sendForm } from "../files/filesApi.js";
import { PAGE_SIZE } from "../messages/messagesApi.js";

const BASE_URL = "/api/v1";

const portalUrl = (workspaceId) => {
  return `/workspaces/${workspaceId}/portal`;
};

// A plain link the browser can open. The session cookie goes along with it.
export const portalFileUrl = (workspaceId, fileId, inline = false) => {
  const suffix = inline ? "?inline=1" : "";

  return `${BASE_URL}${portalUrl(workspaceId)}/files/${fileId}/download${suffix}`;
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
  sendMessage: ({ workspaceId, clientId, input, files, onProgress }) => {
    const url = `${portalUrl(workspaceId)}/clients/${clientId}/messages`;

    if (!files || files.length === 0) {
      return api.post(url, input);
    }

    const form = new FormData();

    form.append("body", input.body);
    files.forEach((file) => {
      form.append("files", file);
    });

    return sendForm({
      url: `${BASE_URL}${url}`,
      form,
      onProgress: onProgress ?? (() => {}),
    });
  },
  review: ({ workspaceId, taskId, input }) => {
    return api.post(`${portalUrl(workspaceId)}/tasks/${taskId}/review`, input);
  },
  files: (workspaceId, clientId) => {
    const filter = clientId ? `&clientId=${clientId}` : "";

    return api.get(`${portalUrl(workspaceId)}/files?page=1&pageSize=100${filter}`);
  },
};
