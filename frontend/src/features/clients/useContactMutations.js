import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "./contactsApi.js";
import { clientsKey } from "./useClients.js";

// A contact change also changes the activity feed, and the client list's search results,
// so refresh everything about this workspace's clients.
const useRefreshClients = () => {
  const queryClient = useQueryClient();

  return (workspaceId) => {
    return queryClient.invalidateQueries({ queryKey: clientsKey(workspaceId) });
  };
};

export const useCreateContact = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: contactsApi.create,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};

export const useUpdateContact = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: contactsApi.update,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};

export const useDeleteContact = () => {
  const refresh = useRefreshClients();

  return useMutation({
    mutationFn: contactsApi.remove,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};
