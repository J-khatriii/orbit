import { useQuery } from "@tanstack/react-query";
import { filesApi } from "./filesApi.js";

export const filesKey = (workspaceId, clientId) => {
  return ["workspaces", workspaceId, "client-files", clientId];
};

export const useFiles = (workspaceId, clientId) => {
  return useQuery({
    queryKey: filesKey(workspaceId, clientId),
    queryFn: () => {
      return filesApi.list(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && Boolean(clientId),
  });
};
