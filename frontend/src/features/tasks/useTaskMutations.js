import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsKey } from "../clients/useClients.js";
import { projectsKey } from "../projects/useProjects.js";
import { tasksApi } from "./tasksApi.js";

// A task change updates the project's counts and activity, and its client's activity, so
// refresh all of those.
const useTaskMutation = (mutationFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsKey(variables.workspaceId) }),
        queryClient.invalidateQueries({ queryKey: clientsKey(variables.workspaceId) }),
      ]);
    },
  });
};

export const useCreateTask = () => {
  return useTaskMutation(tasksApi.create);
};

export const useUpdateTask = () => {
  return useTaskMutation(tasksApi.update);
};

export const useMoveTask = () => {
  return useTaskMutation(tasksApi.move);
};

export const useDeleteTask = () => {
  return useTaskMutation(tasksApi.remove);
};
