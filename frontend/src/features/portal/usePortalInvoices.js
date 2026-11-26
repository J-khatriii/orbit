import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portalInvoicesApi } from "./portalInvoicesApi.js";

const POLL_MS = 3000;

export const usePortalInvoices = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "portal-invoices", "list", clientId || "all"],
    queryFn: () => {
      return portalInvoicesApi.list(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};

// With `poll` on, the invoice is re-read every few seconds until it shows as paid. Used while
// a payment made on Stripe is still being confirmed.
export const usePortalInvoice = (workspaceId, invoiceId, enabled = true, poll = false) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "portal-invoices", "detail", invoiceId],
    queryFn: () => {
      return portalInvoicesApi.get(workspaceId, invoiceId);
    },
    enabled: Boolean(workspaceId) && Boolean(invoiceId) && enabled,
    refetchInterval: (query) => {
      if (!poll || query.state.data?.invoice.status === "paid") {
        return false;
      }

      return POLL_MS;
    },
  });
};

export const useStartCheckout = (workspaceId, invoiceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      return portalInvoicesApi.checkout(workspaceId, invoiceId);
    },
    // If the invoice can no longer be paid online (just paid, voided, Stripe disconnected),
    // re-read it so the button goes away.
    onError: () => {
      return queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "portal-invoices"],
      });
    },
  });
};
