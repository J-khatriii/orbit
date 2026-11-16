import { BASE_URL, api } from "../../lib/api.js";
import { sendForm } from "../files/filesApi.js";

// Messages per page. Set this to 2 to test "Load earlier messages", then put it back.
export const PAGE_SIZE = 30;

const messagesUrl = (workspaceId, clientId) => {
  return `/workspaces/${workspaceId}/clients/${clientId}/messages`;
};

const noProgress = () => {};

export const messagesApi = {
  list: (workspaceId, clientId, page) => {
    return api.get(`${messagesUrl(workspaceId, clientId)}?page=${page}&pageSize=${PAGE_SIZE}`);
  },
  // Plain JSON when there are no files, a form with the files when there are.
  create: ({ workspaceId, clientId, input, files, onProgress }) => {
    const url = messagesUrl(workspaceId, clientId);

    if (!files || files.length === 0) {
      return api.post(url, input);
    }

    const form = new FormData();

    // Text fields first, the files after.
    form.append("body", input.body);
    form.append("internal", String(input.internal));
    files.forEach((file) => {
      form.append("files", file);
    });

    return sendForm({ url: `${BASE_URL}${url}`, form, onProgress: onProgress ?? noProgress });
  },
};
