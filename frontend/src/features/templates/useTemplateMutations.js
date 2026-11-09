import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesApi } from "./templatesApi.js";
import { templatesKey } from "./useTemplates.js";

const useTemplateMutation = (mutationFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({ queryKey: templatesKey(variables.workspaceId) });
    },
  });
};

export const useCreateTemplate = () => {
  return useTemplateMutation(templatesApi.create);
};

export const useUpdateTemplate = () => {
  return useTemplateMutation(templatesApi.update);
};

export const useDeleteTemplate = () => {
  return useTemplateMutation(templatesApi.remove);
};
