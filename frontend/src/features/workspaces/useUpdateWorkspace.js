import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ME_QUERY_KEY } from "../auth/queryKeys.js";
import { workspacesApi } from "./workspacesApi.js";

// Saves changes, then swaps the updated workspace into the cached "who am I", so the
// sidebar, the breadcrumb and the guards all see the new values straight away.
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, changes }) => {
      return workspacesApi.update(workspaceId, changes);
    },
    onSuccess: ({ workspace }) => {
      queryClient.setQueryData(ME_QUERY_KEY, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          workspaces: current.workspaces.map((item) => {
            return item.id === workspace.id ? workspace : item;
          }),
        };
      });
    },
  });
};
