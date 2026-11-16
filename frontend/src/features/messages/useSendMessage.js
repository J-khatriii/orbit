import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesKey } from "../files/useFiles.js";
import { messagesApi } from "./messagesApi.js";
import { messagesKey } from "./useMessages.js";

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagesApi.create,
    onSuccess: (data, variables) => {
      // Attached files also show up in the client's Files tab.
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagesKey(variables.workspaceId, variables.clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: filesKey(variables.workspaceId, variables.clientId),
        }),
      ]);
    },
  });
};
