import { useQuery } from "@tanstack/react-query";
import { portalInvoicesApi } from "./portalInvoicesApi.js";

export const usePortalInvoices = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "portal-invoices", "list", clientId || "all"],
    queryFn: () => {
      return portalInvoicesApi.list(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};

export const usePortalInvoice = (workspaceId, invoiceId, enabled = true) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "portal-invoices", "detail", invoiceId],
    queryFn: () => {
      return portalInvoicesApi.get(workspaceId, invoiceId);
    },
    enabled: Boolean(workspaceId) && Boolean(invoiceId) && enabled,
  });
};
