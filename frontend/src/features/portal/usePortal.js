import { useQuery } from "@tanstack/react-query";
import { portalApi } from "./portalApi.js";

export const portalKey = (workspaceId) => {
  return ["workspaces", workspaceId, "portal"];
};

export const usePortalProjects = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: [...portalKey(workspaceId), "projects"],
    queryFn: () => {
      return portalApi.projects(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.projects;
    },
  });
};

export const usePortalProject = (workspaceId, projectId, enabled = true) => {
  return useQuery({
    queryKey: [...portalKey(workspaceId), "project", projectId],
    queryFn: () => {
      return portalApi.project(workspaceId, projectId);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};
