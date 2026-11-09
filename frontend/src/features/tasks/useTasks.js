import { useQuery } from "@tanstack/react-query";
import { projectsKey } from "../projects/useProjects.js";
import { tasksApi } from "./tasksApi.js";

// Starts with the projects key, so anything that refreshes projects (edits, archiving)
// refreshes their tasks too.
export const tasksKey = (workspaceId, projectId) => {
  return [...projectsKey(workspaceId), "tasks", projectId];
};

export const useTasks = (workspaceId, projectId, enabled = true) => {
  return useQuery({
    queryKey: tasksKey(workspaceId, projectId),
    queryFn: () => {
      return tasksApi.list(workspaceId, projectId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.tasks;
    },
  });
};
