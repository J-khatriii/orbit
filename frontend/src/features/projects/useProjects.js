import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { projectsApi } from "./projectsApi.js";

export const projectsKey = (workspaceId) => {
  return ["workspaces", workspaceId, "projects"];
};

export const useProjects = (workspaceId, filters, enabled = true) => {
  return useQuery({
    queryKey: [...projectsKey(workspaceId), "list", filters],
    queryFn: () => {
      return projectsApi.list(workspaceId, filters);
    },
    enabled: Boolean(workspaceId) && enabled,
    placeholderData: keepPreviousData,
  });
};

export const useProject = (workspaceId, projectId, enabled = true) => {
  return useQuery({
    queryKey: [...projectsKey(workspaceId), "detail", projectId],
    queryFn: () => {
      return projectsApi.get(workspaceId, projectId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.project;
    },
  });
};

export const useProjectActivity = (workspaceId, projectId, pageSize) => {
  return useQuery({
    queryKey: [...projectsKey(workspaceId), "activity", projectId, pageSize],
    queryFn: () => {
      return projectsApi.activity(workspaceId, projectId, pageSize);
    },
    enabled: Boolean(workspaceId),
    // "Show more" keeps the current lines on screen while the longer list loads.
    placeholderData: keepPreviousData,
  });
};
