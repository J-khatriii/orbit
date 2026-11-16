import { ApiError, api } from "../../lib/api.js";

const BASE_URL = "/api/v1";
const PAGE_SIZE = 100;

const filesUrl = (workspaceId, clientId) => {
  return `/workspaces/${workspaceId}/clients/${clientId}/files`;
};

export const downloadUrl = ({ workspaceId, clientId, fileId, inline = false }) => {
  const suffix = inline ? "?inline=1" : "";

  return `${BASE_URL}${filesUrl(workspaceId, clientId)}/${fileId}/download${suffix}`;
};
const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const sendForm = ({ url, form, onProgress }) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", url);
    request.withCredentials = true;

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const data = parseJson(request.responseText);

      if (request.status >= 200 && request.status < 300) {
        resolve(data);
        return;
      }

      const error = data?.error;

      reject(
        new ApiError(
          request.status,
          error?.code ?? "UNKNOWN_ERROR",
          error?.message ?? "Something went wrong. Please try again.",
          error?.details,
        ),
      );
    };

    request.onerror = () => {
      reject(
        new ApiError(
          0,
          "NETWORK_ERROR",
          "Can't reach the server. Check your connection and try again.",
        ),
      );
    };

    request.send(form);
  });
};

export const filesApi = {
  list: (workspaceId, clientId) => {
    return api.get(`${filesUrl(workspaceId, clientId)}?page=1&pageSize=${PAGE_SIZE}`);
  },
  upload: ({ workspaceId, clientId, file, clientVisible, onProgress }) => {
    const form = new FormData();

    // Text fields first, the file last.
    form.append("clientVisible", String(clientVisible));
    form.append("file", file);

    return sendForm({
      url: `${BASE_URL}${filesUrl(workspaceId, clientId)}`,
      form,
      onProgress,
    });
  },
  update: ({ workspaceId, clientId, fileId, input }) => {
    return api.patch(`${filesUrl(workspaceId, clientId)}/${fileId}`, input);
  },
  remove: ({ workspaceId, clientId, fileId }) => {
    return api.delete(`${filesUrl(workspaceId, clientId)}/${fileId}`);
  },
};
