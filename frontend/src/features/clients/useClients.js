import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { clientsApi } from "./clientsApi.js";

// Everything about a workspace's clients lives under this key, so one
// invalidation refreshes the list, the tags and (later) single clients.
export const clientsKey = (workspaceId) => {
  return ["workspaces", workspaceId, "clients"];
};

export const useClients = (workspaceId, filters, enabled = true) => {
  return useQuery({
    queryKey: [...clientsKey(workspaceId), "list", filters],
    queryFn: () => {
      return clientsApi.list(workspaceId, filters);
    },
    enabled: Boolean(workspaceId) && enabled,
    // While the next page loads, keep showing the current one instead of a blank screen.
    placeholderData: keepPreviousData,
  });
};

export const useClientTags = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: [...clientsKey(workspaceId), "tags"],
    queryFn: () => {
      return clientsApi.tags(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.tags;
    },
  });
};
