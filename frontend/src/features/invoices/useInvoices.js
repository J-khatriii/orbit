import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "./invoicesApi.js";

export const invoicesKey = (workspaceId) => {
  return ["workspaces", workspaceId, "invoices"];
};

// filters: { clientId, status, page }
export const useInvoices = (workspaceId, filters = {}, enabled = true) => {
  return useQuery({
    queryKey: [...invoicesKey(workspaceId), "list", filters],
    queryFn: () => {
      return invoicesApi.list(workspaceId, filters);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};

export const useInvoice = (workspaceId, invoiceId, enabled = true) => {
  return useQuery({
    queryKey: [...invoicesKey(workspaceId), "detail", invoiceId],
    queryFn: () => {
      return invoicesApi.get(workspaceId, invoiceId);
    },
    enabled: Boolean(workspaceId) && Boolean(invoiceId) && enabled,
  });
};
