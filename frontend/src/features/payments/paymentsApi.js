import { api } from "../../lib/api.js";

const stripePath = (workspaceId) => {
  return `/workspaces/${workspaceId}/payments/stripe`;
};

export const paymentsApi = {
  status: (workspaceId) => {
    return api.get(stripePath(workspaceId));
  },
  connect: (workspaceId) => {
    return api.post(`${stripePath(workspaceId)}/connect`);
  },
  disconnect: (workspaceId) => {
    return api.delete(stripePath(workspaceId));
  },
};
