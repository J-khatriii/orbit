import { useMutation, useQueryClient } from "@tanstack/react-query";
import { portalApi } from "./portalApi.js";
import { portalKey } from "./usePortal.js";

export const useSendClientMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: portalApi.sendMessage,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({
        queryKey: [...portalKey(variables.workspaceId), "messages", variables.clientId],
      });
    },
  });
};
