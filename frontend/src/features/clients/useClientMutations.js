import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "./clientsApi.js";
import { clientsKey } from "./useClients.js";

// After any change, refresh everything about this workspace's clients: the list, the tags
// in the filter, and (later) single client pages.
const useRefreshClients = () => {
  const queryClient = useQueryClient();

  return (workspaceId) => {
    return queryClient.invalidateQueries({ queryKey: clientsKey(workspaceId) });
  };
};

export const useCreateClient = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};

export const useUpdateClient = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: clientsApi.update,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};

export const useSetClientArchived = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: clientsApi.setArchived,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};
