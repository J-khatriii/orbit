import { BASE_URL, api } from "../../lib/api.js";

const portalUrl = (workspaceId) => {
  return `/workspaces/${workspaceId}/portal`;
};

// A plain link the browser can open. The session cookie goes along with it.
export const portalInvoicePdfUrl = (workspaceId, invoiceId, inline = false) => {
  const suffix = inline ? "?inline=1" : "";

  return `${BASE_URL}${portalUrl(workspaceId)}/invoices/${invoiceId}/pdf${suffix}`;
};

export const portalInvoicesApi = {
  list: (workspaceId, clientId) => {
    const filter = clientId ? `&clientId=${clientId}` : "";

    return api.get(`${portalUrl(workspaceId)}/invoices?page=1&pageSize=100${filter}`);
  },
  get: (workspaceId, invoiceId) => {
    return api.get(`${portalUrl(workspaceId)}/invoices/${invoiceId}`);
  },
  // Resolves to { url }: Stripe's page for paying what is still owed.
  checkout: (workspaceId, invoiceId) => {
    return api.post(`${portalUrl(workspaceId)}/invoices/${invoiceId}/checkout`);
  },
};
