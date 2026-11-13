import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "./notificationsApi.js";
import { notificationsKey } from "./useNotifications.js";

export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({ queryKey: notificationsKey(variables.workspaceId) });
    },
  });
};
