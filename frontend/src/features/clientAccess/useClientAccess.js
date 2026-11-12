import { useQuery } from "@tanstack/react-query";
import { clientAccessApi } from "./clientAccessApi.js";

export const clientAccessKey = (workspaceId, clientId) => {
  return ["workspaces", workspaceId, "client-access", clientId];
};

export const useClientAccess = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: [...clientAccessKey(workspaceId, clientId), "people"],
    queryFn: () => {
      return clientAccessApi.list(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.people;
    },
  });
};

export const useAccessCandidates = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: [...clientAccessKey(workspaceId, clientId), "candidates"],
    queryFn: () => {
      return clientAccessApi.candidates(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.people;
    },
  });
};
