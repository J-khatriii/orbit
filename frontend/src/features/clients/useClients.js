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

export const useClient = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: [...clientsKey(workspaceId), "detail", clientId],
    queryFn: () => {
      return clientsApi.get(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.client;
    },
  });
};

export const useClientActivity = (workspaceId, clientId, pageSize) => {
  return useQuery({
    queryKey: [...clientsKey(workspaceId), "activity", clientId, pageSize],
    queryFn: () => {
      return clientsApi.activity(workspaceId, clientId, pageSize);
    },
    enabled: Boolean(workspaceId),
    // "Show more" keeps the current lines on screen while the longer list loads.
    placeholderData: keepPreviousData,
  });
};
