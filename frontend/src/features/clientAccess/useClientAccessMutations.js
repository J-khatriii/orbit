import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientAccessApi } from "./clientAccessApi.js";
import { clientAccessKey } from "./useClientAccess.js";

const useAccessMutation = (mutationFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({
        queryKey: clientAccessKey(variables.workspaceId, variables.clientId),
      });
    },
  });
};

export const useGrantAccess = () => {
  return useAccessMutation(clientAccessApi.grant);
};

export const useRevokeAccess = () => {
  return useAccessMutation(clientAccessApi.revoke);
};
