import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "./paymentsApi.js";

export const stripeStatusKey = (workspaceId) => {
  return ["workspaces", workspaceId, "payments", "stripe"];
};

// The status is re-read every time the page opens, because the owner may have just
// finished (or abandoned) Stripe's onboarding in another tab.
export const useStripeStatus = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: stripeStatusKey(workspaceId),
    queryFn: () => {
      return paymentsApi.status(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    refetchOnMount: "always",
  });
};

// Resolves to { url }: the page on Stripe where the owner finishes setting up.
export const useConnectStripe = (workspaceId) => {
  return useMutation({
    mutationFn: () => {
      return paymentsApi.connect(workspaceId);
    },
  });
};

export const useDisconnectStripe = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      return paymentsApi.disconnect(workspaceId);
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: stripeStatusKey(workspaceId) });
    },
  });
};
