import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsKey } from "../clients/useClients.js";
import { projectsApi } from "./projectsApi.js";
import { projectsKey } from "./useProjects.js";

// A project change also shows up in its client's activity, so refresh both.
const useRefresh = () => {
  const queryClient = useQueryClient();

  return (workspaceId) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: clientsKey(workspaceId) }),
    ]);
  };
};

const useProjectMutation = (mutationFn) => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      return refresh(variables.workspaceId);
    },
  });
};

export const useCreateProject = () => {
  return useProjectMutation(projectsApi.create);
};

export const useUpdateProject = () => {
  return useProjectMutation(projectsApi.update);
};

export const useSetProjectArchived = () => {
  return useProjectMutation(projectsApi.setArchived);
};

export const useAddProjectMember = () => {
  return useProjectMutation(projectsApi.addMember);
};

export const useRemoveProjectMember = () => {
  return useProjectMutation(projectsApi.removeMember);
};
