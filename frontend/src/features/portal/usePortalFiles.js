import { useQuery } from "@tanstack/react-query";
import { portalApi } from "./portalApi.js";

export const portalFilesKey = (workspaceId, clientId) => {
  return ["workspaces", workspaceId, "portal-files", clientId || "all"];
};

export const usePortalFiles = (workspaceId, clientId, enabled = true) => {
  return useQuery({
    queryKey: portalFilesKey(workspaceId, clientId),
    queryFn: () => {
      return portalApi.files(workspaceId, clientId);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};
