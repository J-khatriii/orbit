import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "./messagesApi.js";
import { messagesKey } from "./useMessages.js";

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagesApi.create,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({
        queryKey: messagesKey(variables.workspaceId, variables.clientId),
      });
    },
  });
};
