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

export const useReviewTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: portalApi.review,
    // Runs on success and on failure, so the page refreshes either way, for example when the
    // task was changed by someone else. It doesn't wait for the refresh: the screen's own
    // handlers (the toast) must run before the task leaves the "In review" group.
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: portalKey(variables.workspaceId) });
    },
  });
};
