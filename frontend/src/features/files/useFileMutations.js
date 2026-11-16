import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "./filesApi.js";
import { filesKey } from "./useFiles.js";

const useRefreshFiles = () => {
  const queryClient = useQueryClient();

  return (variables) => {
    return queryClient.invalidateQueries({
      queryKey: filesKey(variables.workspaceId, variables.clientId),
    });
  };
};

export const useUploadFile = () => {
  const refresh = useRefreshFiles();

  return useMutation({
    mutationFn: filesApi.upload,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useUpdateFile = () => {
  const refresh = useRefreshFiles();

  return useMutation({
    mutationFn: filesApi.update,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};

export const useDeleteFile = () => {
  const refresh = useRefreshFiles();

  return useMutation({
    mutationFn: filesApi.remove,
    onSuccess: (data, variables) => {
      return refresh(variables);
    },
  });
};
