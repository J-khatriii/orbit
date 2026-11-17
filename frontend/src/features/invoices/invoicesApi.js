import { BASE_URL, api } from "../../lib/api.js";

export const PAGE_SIZE = 50;

const invoicesUrl = (workspaceId) => {
  return `/workspaces/${workspaceId}/invoices`;
};

// A plain link the browser can open. The session cookie goes along with it.
export const invoicePdfUrl = (workspaceId, invoiceId, inline = false) => {
  const suffix = inline ? "?inline=1" : "";

  return `${BASE_URL}${invoicesUrl(workspaceId)}/${invoiceId}/pdf${suffix}`;
};

export const invoicesApi = {
  list: (workspaceId, { clientId, status, page = 1 } = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });

    if (clientId) {
      params.set("clientId", clientId);
    }
    if (status) {
      params.set("status", status);
    }

    return api.get(`${invoicesUrl(workspaceId)}?${params.toString()}`);
  },
  get: (workspaceId, invoiceId) => {
    return api.get(`${invoicesUrl(workspaceId)}/${invoiceId}`);
  },
  create: ({ workspaceId, input }) => {
    return api.post(invoicesUrl(workspaceId), input);
  },
  update: ({ workspaceId, invoiceId, input }) => {
    return api.patch(`${invoicesUrl(workspaceId)}/${invoiceId}`, input);
  },
  send: ({ workspaceId, invoiceId }) => {
    return api.post(`${invoicesUrl(workspaceId)}/${invoiceId}/send`);
  },
  markVoid: ({ workspaceId, invoiceId }) => {
    return api.post(`${invoicesUrl(workspaceId)}/${invoiceId}/void`);
  },
  remove: ({ workspaceId, invoiceId }) => {
    return api.delete(`${invoicesUrl(workspaceId)}/${invoiceId}`);
  },
};
