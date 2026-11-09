import { useQuery } from "@tanstack/react-query";
import { projectsKey } from "../projects/useProjects.js";
import { tasksApi } from "./tasksApi.js";

// Starts with the projects key on purpose: every task or project change already refreshes
// that, so this list stays current without extra wiring.
export const myTasksKey = (workspaceId, view) => {
  return [...projectsKey(workspaceId), "my-tasks", view];
};

export const useMyTasks = (workspaceId, view, enabled = true) => {
  return useQuery({
    queryKey: myTasksKey(workspaceId, view),
    queryFn: () => {
      return tasksApi.mine(workspaceId, view);
    },
    enabled: Boolean(workspaceId) && enabled,
  });
};
